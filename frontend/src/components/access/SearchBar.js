import * as React from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import SearchIcon from '@mui/icons-material/Search'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'

export const filterUsersBySearch = (allUsers, searchText) => {
  return Object.values(allUsers).filter(
    user => user.username.toLowerCase().includes(searchText.toLowerCase()),
  )
}

export default function SearchBar () {
  const [searchText, setSearchText] = React.useState('')

  const handleSearch = (event) => {
    setSearchText(event.target.value)
  }

  const handleCancelSearch = () => {
    setSearchText('')
  }

  return (
    <Box>
      <Grid container sx={{
        mx: '0.5vw',
        width: '25vw',
        height: '6vh',
        backgroundColor: '#',
      }} direction="column" justifyContent="center">
        <Grid container sx={{ width: '2vw', height: '5vh', mx: 'auto', my: 'auto', backgroundColor: '' }}
              direction="column" justifyContent="center">
          <SearchIcon sx={{ width: '2vw', mt: '0.5vh' }}/>
        </Grid>
        <Grid container sx={{ width: '18vw', height: '5vh', mx: 'auto', backgroundColor: '#' }}>
          <TextField
            placeholder="Search User…"
            inputProps={{ style: { textAlign: 'left', fontSize: '1.5vw' } }}
            onChange={handleSearch}
            fullWidth={true}
            value={searchText}
            sx={{ height: '5vh' }}
          />
        </Grid>
        <Grid container sx={{ width: '2vw', height: '5vh', mx: 'auto', my: 'auto', backgroundColor: '' }}
              direction="column" justifyContent="center">
          <IconButton sx={{ p: '10px', width: '2vw', height: '2vw' }} onClick={handleCancelSearch}>
            <CloseOutlinedIcon sx={{ width: '2vw', mt: '0.5vh' }}/>
          </IconButton>
        </Grid>
      </Grid>

      {/* For debugging, will delete */}
      {/* SearchText:{searchText} */}
    </Box>
  )
}
