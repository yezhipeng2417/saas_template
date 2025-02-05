import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createUser, deleteUser, updateUser } from '@/lib/actions/user.actions'
import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const headerPayload = headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    console.log('Received webhook request with headers:', {
      svix_id,
      svix_timestamp,
      svix_signature: svix_signature ? 'present' : 'missing'
    });

    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error('Missing svix headers');
      return new Response('Error occurred -- no svix headers', {
        status: 400
      });
    }

    const payload = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload, null, 2));
    const body = JSON.stringify(payload);
    
    const wh = new Webhook(process.env.WEBHOOK_SECRET || '');
    let evt: WebhookEvent;

    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return new Response('Error occurred', {
        status: 400
      });
    }

    const eventType = evt.type;
    console.log('Processing webhook event:', eventType);

    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, image_url, first_name, last_name, username } = evt.data;
        
        console.log('Processing user.created event with data:', {
          id,
          email: email_addresses?.[0]?.email_address,
          username,
          first_name,
          last_name,
          image_url
        });
        
        if (!email_addresses?.[0]?.email_address) {
          console.error('No email address found in user data');
          return new Response('Invalid user data', { status: 400 });
        }

        const user = {
          clerkId: id,
          email: email_addresses[0].email_address,
          username: username || email_addresses[0].email_address.split('@')[0],
          firstName: first_name || '',
          lastName: last_name || '',
          photo: image_url || 'https://example.com/default-avatar.png',
        };

        console.log('Attempting to create user with data:', user);
        const newUser = await createUser(user);

        if (!newUser) {
          console.error('Failed to create user in database');
          return new Response('Failed to create user', { status: 500 });
        }

        console.log('Successfully created user:', newUser);

        // Temporarily disable metadata update
        /*
        try {
          await clerkClient.users.updateUser(id, {
            publicMetadata: {
              userId: newUser._id.toString()
            }
          });
        } catch (err) {
          console.error('Failed to update Clerk metadata:', err);
        }
        */

        return NextResponse.json({ message: 'OK', user: newUser });
      }

      case 'user.updated': {
        const { id, image_url, first_name, last_name, username } = evt.data;

        const user = {
          firstName: first_name || '',
          lastName: last_name || '',
          username: username || '',
          photo: image_url || '',
        };

        const updatedUser = await updateUser(id, user);
        return NextResponse.json({ message: 'OK', user: updatedUser });
      }

      case 'user.deleted': {
        const { id } = evt.data;
        const deletedUser = await deleteUser(id);
        return NextResponse.json({ message: 'OK', user: deletedUser });
      }

      default: {
        return new Response(`Webhook event type ${eventType} not handled`, { status: 400 });
      }
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 