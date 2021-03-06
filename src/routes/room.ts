import { Router } from 'express';
import { twilioClient } from '../index';

import { jwt } from 'twilio';
import { VideoGrant } from 'twilio/lib/jwt/AccessToken';
import { LocalTrack } from 'twilio-video/tsdef/types';
// import { connect, ConnectOptions, LocalTrack } from 'twilio-video'

interface Room {
    name: string;
    sid: string;
}

const roomsRouter = Router();

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioApiKey = process.env.TWILIO_API_KEY;
const twilioApiSecret = process.env.TWILIO_API_SECRET;


/**
 * Create a token for connecting a user to an specific room
 */
roomsRouter.post('/token', async (request, response) => {
    const roomName: string = request.body.roomName || '';
    const username: string = request.body.username || '';

    const videoGrant = new VideoGrant({
        room: roomName,
    });

    const token = new jwt.AccessToken(
        twilioAccountSid!,
        twilioApiKey!,
        twilioApiSecret!,
        { identity: username })

    token.addGrant(videoGrant);

    return response.status(200).send(
        {
            ...request.body,
            token: token.toJwt()
        }
    )
})

/**
 * Create a new video room
 */
roomsRouter.post('/create', async (request, response, next) => {

    // Get the room name from the request body.
    // If a roomName was not included in the request, default to an empty string to avoid throwing errors.
    const roomName: string = request.body.roomName || '';
    const tracks: LocalTrack[] = request.body.tracks || [];
    const token: string = request.body.token || '';

    try {
        // Call the Twilio video API to create the new room.
        let room = await twilioClient.video.rooms.create({
            uniqueName: roomName,
            type: 'group'
            // type: 'peer-to-peer'
        });


        // Return the room details in the response.
        return response.status(200).send(room)

    } catch (error) {
        // If something went wrong, handle the error.
        return response.status(400).send({
            message: `Unable to create new room with name=${roomName}`,
            error
        });
    }
});


/**
 * Get active participants of a room
 */
roomsRouter.post('/participants', async (request, response, next) => {
    try {
        const roomName = request.body.roomName || '';


        twilioClient.video.rooms(roomName)
            .participants
            .each({ status: 'connected' }, (participant: any) => {
                return response.status(200).send({
                    ...participant
                })
            })
    } catch (err) {
        console.error(err)
    }
})


/**
* List active video rooms
*
* You can also select other ways to filter/list!
* For the purposes of this tutorial, though, only the in-progress rooms are returned.
*/
roomsRouter.get('/', async (request, response, next) => {
    try {
        // Get the last 20 rooms that are still currently in progress.
        const rooms = await twilioClient.video.rooms.list({ status: 'in-progress', limit: 20 });

        // If there are no in-progress rooms, return a response that no active rooms were found.
        if (!rooms.length) {
            return response.status(200).send({
                message: 'No active rooms found',
                activeRooms: [],
            });
        }

        // If there are active rooms, create a new array of `Room` objects that will hold this list.
        let activeRooms: Room[] = [];

        // Then, for each room, take only the data you need and push it into the `activeRooms` array.
        rooms.forEach((room: any) => {
            const roomData: Room = {
                sid: room.sid,
                name: room.uniqueName
            }

            activeRooms.push(roomData);
        });

        return response.status(200).send({ activeRooms });

    } catch (error) {
        return response.status(400).send({
            message: `Unable to list active rooms`,
            error
        });
    }
});

/**
 * Get a specific room by its SID (unique identifier)
 *
 * It is also possible to get rooms by name, but this only works for in-progress rooms.
 * You can use this endpoint to get rooms of any status!
 */

roomsRouter.get('/:sid', async (request, response, next) => {
    const sid: string = request.params.sid;

    try {
        // Call the Twilio video API to retrieve the room you created
        const room = await twilioClient.video.rooms(sid).fetch();

        return response.status(200).send({ room });

    } catch (error) {
        return response.status(400).send({
            message: `Unable to get room with sid=${sid}`,
            error
        });
    }
});


/**
* Complete a room
*
* This will update the room's status to `completed` and will end the video chat, disconnecting any participants.
* The room will not be deleted, but it will no longer appear in the list of in-progress rooms.
*/

roomsRouter.post('/:sid/complete', async (request, response, next) => {
    // Get the SID from the request parameters.
    const sid: string = request.params.sid;

    try {
        // Update the status from 'in-progress' to 'completed'.
        const room = await twilioClient.video.rooms(sid).update({ status: 'completed' })

        // Create a `Room` object with the details about the closed room.
        const closedRoom: Room = {
            sid: room.sid,
            name: room.uniqueName,
        }

        return response.status(200).send({ closedRoom });

    } catch (error) {
        return response.status(400).send({
            message: `Unable to complete room with sid=${sid}`,
            error
        });
    }
});

export default roomsRouter;