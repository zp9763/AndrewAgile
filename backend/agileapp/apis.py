from collections import defaultdict

from django.contrib.auth import logout
from django.contrib.auth.models import User
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods, require_GET, require_POST
from django.contrib.auth.decorators import login_required
from rest_framework.parsers import JSONParser

from agileapp.models import Workspace, Permission, Project, Task, Comment
from agileapp.models import UserRole, TaskType, TaskPriority, TaskStatus
from agileapp.messengers import Messenger, PermMessenger, TaskMessenger
from agileapp.serializers import UserSerializer, WorkspaceSerializer, PermissionSerializer, \
    ProjectSerializer, TaskSerializer, CommentSerializer, TaskDetailSerializer


@login_required
@ensure_csrf_cookie
# args and kwargs must be included to fit all requests
def home_view(request, *args, **kwargs):
    return render(request, "index.html")


@require_POST
def logout_api(request):
    logout(request)
    return HttpResponse(status=200)


# ensure frontend has csrftoken in local dev
@ensure_csrf_cookie
@require_GET
def user_info(request):
    if request.user.is_authenticated:
        serializer = UserSerializer(request.user)
        return JsonResponse(serializer.data)
    else:
        return HttpResponse(status=401)


@login_required
@require_GET
def all_workspaces(request):
    workspaces = Workspace.objects.all().order_by('name')
    serializer = WorkspaceSerializer(workspaces, many=True)
    return JsonResponse(serializer.data, safe=False)


@login_required
@require_GET
def workspace_api(request, wid):
    workspace = Workspace.objects.filter(id=wid).first()
    if workspace:
        serializer = WorkspaceSerializer(workspace)
        return JsonResponse(serializer.data)
    else:
        return HttpResponse(status=404)


@login_required
@require_GET
def user_scope(request):
    admin_wids = list(Permission.objects.filter(user=request.user, role=UserRole.ADMIN)
                      .values_list("workspace__id", flat=True))
    editor_wids = list(Permission.objects.filter(user=request.user, role=UserRole.EDITOR)
                       .values_list("workspace__id", flat=True))
    viewer_wids = list(Workspace.objects.exclude(id__in=admin_wids + editor_wids)
                       .values_list("id", flat=True))
    payload = {
        "admin": admin_wids,
        "editor": editor_wids,
        "viewer": viewer_wids,
    }
    return JsonResponse(payload)


@login_required
@require_http_methods(["GET", "PUT"])
def workspace_users(request, wid):
    if request.method == "PUT":
        role_choices = [choice[0] for choice in UserRole.choices]
        data = JSONParser().parse(request)
        errors = {}
        user_roles = defaultdict(list)
        if not Workspace.objects.filter(id=wid):
            errors["workspaceId"] = "Object with this ID does not exist."
        for username, role in data.items():
            if str(role).lower() not in role_choices:
                errors[username] = "Json value should be UserRole type."
            else:
                role = getattr(UserRole, role.upper())
                user = User.objects.filter(username=username).first()
                if not user:
                    errors[username] = "Object with this ID does not exist."
                else:
                    user_roles[role].append(user)
        if errors:
            return JsonResponse(errors, status=400)
        else:
            workspace = Workspace.objects.get(id=wid)
            changelist = PermMessenger.gen_perm_changelist(workspace.id, user_roles)

            perm_query = Permission.objects.select_for_update().filter(workspace=workspace)
            with transaction.atomic():
                for role in (UserRole.ADMIN, UserRole.EDITOR):
                    # batch update existing permission entries
                    exist_perms = perm_query.filter(user__in=user_roles[role])
                    exist_perms.update(
                        role=role,
                        granted_by=request.user,
                        last_updated_at=timezone.now(),
                    )
                    # batch create new permission entries
                    exist_users = exist_perms.values_list("user__username", flat=True)
                    new_users = [user for user in user_roles[role] if user.username not in exist_users]
                    new_perms = [
                        Permission(
                            workspace=workspace,
                            user=user,
                            role=role,
                            granted_by=request.user,
                        ) for user in new_users
                    ]
                    Permission.objects.bulk_create(new_perms)
                # batch delete withdrawn permission entries
                perms = perm_query.filter(user__in=user_roles[UserRole.VIEWER])
                perms.delete()

            PermMessenger.send_perm_msgs(request.user, workspace, changelist)

    # return empty user list for unknown workspace
    workspace = Workspace.objects.filter(id=wid).first()
    if not workspace:
        return JsonResponse([], safe=False)

    # admin and editor permissions in DB
    special_perms = list(Permission.objects.filter(workspace=workspace))
    special_users = [perm.user.username for perm in special_perms]
    # viewer permissions generated ad-hoc
    common_users = User.objects.exclude(username__in=special_users)
    common_perms = [Permission(workspace=workspace, user=user, role=UserRole.VIEWER) for user in common_users]
    # concatenate all permissions into payload
    all_perms = sorted(special_perms + common_perms, key=lambda p: p.user.username)
    serializer = PermissionSerializer(all_perms, many=True)
    return JsonResponse(serializer.data, safe=False)


@login_required
@require_http_methods(["GET", "POST"])
def workspace_projects(request, wid):
    if request.method == "GET":
        projects = Project.objects.filter(workspace__id=wid).order_by('name')
        serializer = ProjectSerializer(projects, many=True)
        return JsonResponse(serializer.data, safe=False)
    elif request.method == "POST":
        data = JSONParser().parse(request)
        data['workspaceId'] = wid
        data['owner'] = request.user
        serializer = ProjectSerializer(data=data)
        if serializer.validate(method='POST'):
            serializer = ProjectSerializer(serializer.save())
            return JsonResponse(serializer.data, status=201)
        else:
            return JsonResponse(serializer.errors, status=400)


@login_required
@require_http_methods(["GET", "PUT", "DELETE"])
def project_api(request, pid):
    if request.method == "GET":
        project = Project.objects.filter(id=pid).first()
        if project:
            serializer = ProjectSerializer(project)
            return JsonResponse(serializer.data)
        else:
            return HttpResponse(status=404)
    elif request.method == "PUT":
        data = JSONParser().parse(request)
        data['id'] = pid
        serializer = ProjectSerializer(data=data)
        if serializer.validate(method='PUT'):
            serializer = ProjectSerializer(serializer.save())
            return JsonResponse(serializer.data)
        else:
            return JsonResponse(serializer.errors, status=400)
    elif request.method == "DELETE":
        project = Project.objects.filter(id=pid).first()
        if project:
            project.delete()
        return HttpResponse(status=200)


@login_required
@require_GET
def workspace_tasks(request, wid):
    tasks = Task.objects.filter(project__workspace__id=wid).order_by('title')
    serializer = TaskSerializer(tasks, many=True)
    return JsonResponse(serializer.data, safe=False)


@login_required
@require_http_methods(["GET", "POST"])
def project_tasks(request, pid):
    if request.method == "GET":
        visible = request.GET.get('visible', '') != 'false'
        all_tasks = {}
        for status, _ in TaskStatus.choices:
            tasks = Task.objects.filter(project__id=pid, status=status, visible=visible).order_by('title')
            serializer = TaskSerializer(tasks, many=True)
            all_tasks[status] = serializer.data
        return JsonResponse(all_tasks)
    elif request.method == "POST":
        data = JSONParser().parse(request)
        data['projectId'] = pid
        serializer = TaskSerializer(data=data)
        if serializer.validate(method='POST'):
            serializer = TaskSerializer(serializer.save(user=request.user))
            return JsonResponse(serializer.data, status=201)
        else:
            return JsonResponse(serializer.errors, status=400)


@login_required
@require_http_methods(["GET", "PUT", "DELETE"])
def task_api(request, tid):
    if request.method == "GET":
        task = Task.objects.filter(id=tid).first()
        if task:
            serializer = TaskDetailSerializer(task)
            return JsonResponse(serializer.data)
        else:
            return HttpResponse(status=404)
    elif request.method == "PUT":
        data = JSONParser().parse(request)
        data['id'] = tid
        serializer = TaskSerializer(data=data)
        if serializer.validate(method='PUT'):
            serializer = TaskSerializer(serializer.save(user=request.user))
            return JsonResponse(serializer.data)
        else:
            return JsonResponse(serializer.errors, status=400)
    elif request.method == "DELETE":
        task = Task.objects.filter(id=tid).first()
        if task:
            TaskMessenger.send_task_msgs('TaskDeleted', request.user, task, None)
            task.delete()
        return HttpResponse(status=200)


@login_required
@require_POST
def task_comments(request, tid):
    data = JSONParser().parse(request)
    data['taskId'] = tid
    data['user'] = request.user
    serializer = CommentSerializer(data=data)
    if serializer.validate(method='POST'):
        serializer = CommentSerializer(serializer.save())
        return JsonResponse(serializer.data, status=201)
    else:
        return JsonResponse(serializer.errors, status=400)


@login_required
@require_http_methods(["PUT", "DELETE"])
def comment_api(request, cid):
    if request.method == "PUT":
        data = JSONParser().parse(request)
        data['id'] = cid
        data['user'] = request.user
        serializer = CommentSerializer(data=data)
        if serializer.validate(method='PUT'):
            serializer = CommentSerializer(serializer.save())
            return JsonResponse(serializer.data)
        else:
            return JsonResponse(serializer.errors, status=400)
    elif request.method == "DELETE":
        comment = Comment.objects.filter(id=cid).first()
        if comment:
            if request.user != comment.user:
                error = {"error": "Only the original commenter can delete."}
                return JsonResponse(error, status=403)
            else:
                comment.delete()
        return HttpResponse(status=200)


@login_required
@require_http_methods(["POST", "DELETE"])
def watcher_api(request, tid):
    task = Task.objects.filter(id=tid).first()
    if not task:
        return HttpResponse(status=404)
    elif request.method == "POST":
        task.watchers.add(request.user)
    elif request.method == "DELETE":
        if task.assignee == request.user or task.reporter == request.user:
            error = {"error": "Task assignee and reporter cannot unwatch."}
            return JsonResponse(error, status=403)
        else:
            task.watchers.remove(request.user)
    return HttpResponse(status=200)


@login_required
@require_http_methods(["GET", "DELETE"])
def message_api(request):
    if request.method == "GET":
        msgs = Messenger.pull_msgs(receiver=request.user.username)
        return JsonResponse(msgs, safe=False)
    elif request.method == "DELETE":
        msg_ids = JSONParser().parse(request)
        error_flag = False
        if not isinstance(msg_ids, list):
            error_flag = True
        else:
            for msg_id in msg_ids:
                if not isinstance(msg_id, str):
                    error_flag = True
                    break
        if error_flag:
            error = {"error": "Json payload should be a list of string IDs."}
            return JsonResponse(error, status=400)
        else:
            Messenger.ack_msgs(request.user.username, msg_ids)
            return HttpResponse(status=200)
