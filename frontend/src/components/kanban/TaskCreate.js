import React from 'react'
import Box from '@mui/material/Box'
import { Dialog } from '@mui/material'
import { Grid } from '@mui/material'
import { Button } from '@mui/material'
import { TextField } from '@mui/material'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import InputBase from '@mui/material/InputBase'
import axios from 'axios'
import { sanitizeBlank } from '../../utils/formats'
import { typeColorDict, statusColorDict, priorityColorDict } from './TaskEdit'

export default function TaskCreate (props) {
  const [title, setTitle] = React.useState('')
  const [type, setType] = React.useState('story')
  const [status, setStatus] = React.useState('backlog')
  const [priority, setPriority] = React.useState('normal')

  const resetNewTaskStates = () => {
    setTitle('')
    setType('story')
    setStatus('backlog')
    setPriority('normal')
  }

  const handleCloseTask = () => {
    resetNewTaskStates()
    props.setCreateTaskOpen(false)
  }

  const handleSaveTask = (event) => {
    event.preventDefault()
    const form = new FormData(event.target)
    const params = ['title', 'assigneeId', 'reporterId', 'type', 'status', 'priority', 'description']
    const payload = {}
    for (const param of params) {
      payload[param] = form.get(param)
    }
    axios.post('/api/project/' + props.curProject.id + '/tasks', payload).then(() => {
      props.setRefresh(props.refresh + 1)
      props.setCreateTaskOpen(false)
    }).catch(console.error)
    resetNewTaskStates()
  }

  return (
    <Dialog
      open={props.open}
      onClose={handleCloseTask}
      scroll="paper"
      aria-labelledby="scroll-dialog-title"
      aria-describedby="scroll-dialog-description"
      maxWidth="lg"
      PaperProps={{ sx: { height: '80vh', width: '60vw' } }}
    >
      {/* Bar */}
      <Grid container sx={{ mt: 0, mb: '0%', width: '60vw', height: '10vh', backgroundColor: '#eeeeee' }}>
        <AppBar sx={{ position: 'relative' }}>
          <Toolbar sx={{ height: '10vh' }}>
            <Typography sx={{ flex: 1, fontSize: '1.5vw', fontWeight: 'bold' }} variant="h6" component="div">
              Create Task
            </Typography>

            <IconButton
              edge="start"
              color="inherit"
              onClick={handleCloseTask}
              aria-label="close"
            >
              <CloseIcon/>
            </IconButton>
          </Toolbar>
        </AppBar>
      </Grid>

      <Box component="form" onSubmit={handleSaveTask}
           sx={{ mb: '0%', width: '60vw', height: '70vh', backgroundColor: '#f2f4f4' }}>
        {/* Project Info */}
        <Grid container sx={{ mb: '0%', width: '60vw', height: '10vh', backgroundColor: '#' }}
              direction="row" alignItems="center">
          <Grid item sx={{ mx: '3%', width: '8vw' }}>
            <Typography
              sx={{ fontSize: '1.5vw', fontWeight: 'bold', backgroundColor: '#1976d2', color: '#ffffff' }}
              align="center">Project</Typography>
          </Grid>
          <Grid item sx={{ width: '20%' }}>
            <Typography sx={{ fontSize: '1.5vw', fontWeight: 'bold' }}>{props.curProject.name}</Typography>
          </Grid>
        </Grid>

        {/* Task Info */}

        <Grid container sx={{ width: '60vw', height: '53vh', backgroundColor: '#' }}>
          {/* Detail */}
          <Grid container sx={{
            ml: '3%',
            width: '48%',
            height: '100%',
            border: 2,
            borderColor: '#eeeeee',
            borderRadius: 1,
            backgroundColor: '#eeeeee',
          }}>
            {/* Index Column */}
            <Grid container
                  sx={{ ml: '5%', width: '35%', height: '100%', backgroundColor: '#', fontWeight: 'bold' }}>
              <Grid container sx={{ width: '100%', height: '14%' }} style={{ fontSize: '1.2vw' }} direction="row"
                    alignItems="center">
                Task Title
              </Grid>
              <Grid container sx={{ width: '100%', height: '14%' }} style={{ fontSize: '1.2vw' }} direction="row"
                    alignItems="center">
                Assignee
              </Grid>
              <Grid container sx={{ width: '100%', height: '14%' }} style={{ fontSize: '1.2vw' }} direction="row"
                    alignItems="center">
                Reporter
              </Grid>
              <Grid container sx={{ width: '100%', height: '14%' }} style={{ fontSize: '1.2vw' }} direction="row"
                    alignItems="center">
                Type
              </Grid>
              <Grid container sx={{ width: '100%', height: '14%' }} style={{ fontSize: '1.2vw' }} direction="row"
                    alignItems="center">
                Status
              </Grid>
              <Grid container sx={{ width: '100%', height: '14%' }} style={{ fontSize: '1.2vw' }} direction="row"
                    alignItems="center">
                Priority
              </Grid>
            </Grid>

            {/* Value Column */}
            <Grid container sx={{ mx: '1%', width: '58%', height: '100%', backgroundColor: '#' }}>
              {/* Task Title */}
              <Grid container sx={{ width: '80%', height: '14%', backgroundColor: '#' }} direction="row"
                    alignItems="center">
                <InputBase
                  name="title"
                  id="title"
                  sx={{ width: '90%' }}
                  placeholder="Task Title"
                  value={title}
                  onChange={event => setTitle(sanitizeBlank(event.target.value))}
                  inputProps={{ style: { textAlign: 'left', fontSize: '1.2vw', backgroundColor: '#e0e0e0' } }}
                  required
                />
              </Grid>

              {/* Assignee */}
              <Grid container sx={{ width: '80%', height: '14%', backgroundColor: '#' }} direction="row"
                    alignItems="center">
                <Select
                  name="assigneeId"
                  id="assignee"
                  fullWidth
                  variant="standard"
                  required
                  defaultValue=""
                >
                  {
                    props.allUsers.map((user) => (
                      <MenuItem key={user.username} value={user.username}>{user.username}</MenuItem>
                    ))
                  }
                </Select>
              </Grid>

              {/* Reporter */}
              <Grid container sx={{ width: '80%', height: '14%', backgroundColor: '#' }} direction="row"
                    alignItems="center">
                <Select
                  name="reporterId"
                  id="reporter"
                  fullWidth
                  variant="standard"
                  required
                  defaultValue=""
                >
                  {
                    props.allUsers.map((user) => (
                      <MenuItem key={user.username} value={user.username}>{user.username}</MenuItem>
                    ))
                  }
                </Select>
              </Grid>

              {/* Type */}
              <Grid container sx={{ width: '80%', height: '14%', backgroundColor: '#' }} direction="row"
                    alignItems="center">
                <select
                  name="type"
                  id="type"
                  style={{
                    fontSize: '1.5vw',
                    width: '8ch',
                    border: 0,
                    textAlign: 'left',
                    backgroundColor: typeColorDict[type],
                  }}
                  value={type}
                  onChange={event => setType(event.target.value)}
                  required
                >
                  <option value={'story'}>Story</option>
                  <option value={'issue'}>Issue</option>
                  <option value={'action'}>Action</option>
                </select>
              </Grid>

              {/* Status */}
              <Grid container sx={{ width: '80%', height: '14%', backgroundColor: '#' }} direction="row"
                    alignItems="center">
                <select
                  name="status"
                  id="status"
                  style={{
                    fontSize: '1.5vw',
                    width: '12ch',
                    border: 0,
                    textAlign: 'left',
                    backgroundColor: statusColorDict[status],
                  }}
                  value={status}
                  onChange={event => setStatus(event.target.value)}
                  required
                >
                  <option value={'backlog'}>Backlog</option>
                  <option value={'todo'}>{'Todo'}</option>
                  <option value={'inprogress'}>In Progress</option>
                  <option value={'done'}>Done</option>
                </select>
              </Grid>

              {/* Priority */}
              <Grid container sx={{ width: '80%', height: '14%', backgroundColor: '#' }} direction="row"
                    alignItems="center">
                <select
                  name="priority"
                  id="priority"
                  style={{
                    fontSize: '1.5vw',
                    width: '12ch',
                    border: 0,
                    backgroundColor: priorityColorDict[priority],
                    textAlign: 'left',
                  }}
                  value={priority}
                  onChange={event => setPriority(event.target.value)}
                  required
                >
                  <option value={'critical'} style={{ backgroundColor: '#e0e0e0' }}>Critical</option>
                  <option value={'important'} style={{ backgroundColor: '#e0e0e0' }}>Important</option>
                  <option value={'normal'} style={{ backgroundColor: '#e0e0e0' }}>Normal</option>
                  <option value={'low'} style={{ backgroundColor: '#e0e0e0' }}>Low</option>
                </select>
              </Grid>
            </Grid>
          </Grid>

          {/* Description */}
          <Grid container sx={{ width: '48%', height: '100%', backgroundColor: '#' }}>
            <Grid container sx={{ mx: 'auto', width: '95%', height: '55%', backgroundColor: '#' }}>
              <TextField
                name="description"
                id="description"
                label="Description"
                sx={{ mx: 'auto', width: '90%' }}
                placeholder="Description..."
                rows={8}
                multiline
                focused
              />
            </Grid>
          </Grid>
        </Grid>

        <Grid container sx={{ mt: '1vh', mb: '1vh', width: '60vw', height: '5vh', backgroundColor: '#' }}>
          <Grid container sx={{ mx: '0vw', width: '50vw', height: '100%' }}/>
          <Grid container sx={{ mx: '0vw', width: '10vw', height: '100%', backgroundColor: '#' }} direction="column"
                alignItems="center">
            <Button type="submit" variant="contained"
                    style={{ minWidth: '80%', maxWidth: '80%', height: '100%' }}>Save</Button>
          </Grid>
        </Grid>
      </Box>
    </Dialog>
  )
}
