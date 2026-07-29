import { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';

import { IconButton } from '@mui/material';

export default function History() {

    const { getHistoryOfUser } = useContext(AuthContext);

    const [meetings, setMeetings] = useState([]);

    const routeTo = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(history);
            } catch {
                // IMPLEMENT SNACKBAR
            }
        }

        fetchHistory();
    }, [])
    return (
        <div>
            <IconButton onClick={() => {
                routeTo("/home")
            }}>
                <HomeIcon />
            </IconButton >
            {
                meetings.map((e) => {
                    return (
                        <div key={e._id || e.meetingCode}>
                            <Card variant='outlined'>
                                <CardContent>
                                    <Typography gutterBottom sx={{ color: 'text.secondary', fontSize: 14, mb:0 }}>
                                        Meeting Code:
                                    </Typography>

                                    <Typography sx={{ color: 'text.secondary', mb: 1 }}>{e.meetingCode}</Typography>
                                    <Typography variant="body2" sx={{ mb: 0}}>
                                        Date: {new Date(e.date).toLocaleString()}
                                    </Typography>
                                </CardContent>
                                <CardActions>
                                    <Button size="small" onClick={() => routeTo(`/${e.meetingCode}`)}>Join Again</Button>
                                </CardActions>
                            </Card>
                        </div>
                    )
                })
            }
        </div>
    )
}
