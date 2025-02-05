"use server";

import { revalidatePath } from "next/cache";

import User from "../database/models/user.model";
import { connectToDatabase } from "../database/mongoose";
import { handleError } from "../utils";

// CREATE
export async function createUser(user: CreateUserParams) {
  try {
    await connectToDatabase();
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { clerkId: user.clerkId },
        { email: user.email }
      ]
    });

    if (existingUser) {
      console.log('User already exists:', existingUser);
      return JSON.parse(JSON.stringify(existingUser));
    }

    console.log('Creating new user with data:', user);
    const newUser = await User.create(user);
    
    if (!newUser) {
      throw new Error('Failed to create user');
    }

    console.log('Successfully created user:', newUser);
    return JSON.parse(JSON.stringify(newUser));
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error; // Let the webhook handler catch and process the error
  }
}

// READ
export async function getUserById(userId: string) {
  try {
    console.log('Getting user by ID:', userId);
    await connectToDatabase();
    
    if (!userId) {
      console.error('getUserById called with no userId');
      throw new Error('UserId is required');
    }

    console.log('Searching for user with clerkId:', userId);
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      console.error('User not found for ID:', userId);
      // 临时改为返回 null 而不是抛出错误，方便调试
      return null;
      // throw new Error("User not found");
    }

    console.log('Found user:', user);
    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    console.error('Error in getUserById:', error);
    throw error;
  }
}

// UPDATE
export async function updateUser(clerkId: string, user: UpdateUserParams) {
  try {
    await connectToDatabase();

    const updatedUser = await User.findOneAndUpdate({ clerkId }, user, {
      new: true,
    });

    if (!updatedUser) throw new Error("User update failed");
    
    return JSON.parse(JSON.stringify(updatedUser));
  } catch (error) {
    handleError(error);
  }
}

// DELETE
export async function deleteUser(clerkId: string) {
  try {
    await connectToDatabase();

    // Find user to delete
    const userToDelete = await User.findOne({ clerkId });

    if (!userToDelete) {
      throw new Error("User not found");
    }

    // Delete user
    const deletedUser = await User.findByIdAndDelete(userToDelete._id);
    revalidatePath("/");

    return deletedUser ? JSON.parse(JSON.stringify(deletedUser)) : null;
  } catch (error) {
    handleError(error);
  }
}

// USE CREDITS
export async function updateCredits(userId: string, creditFee: number) {
  try {
    await connectToDatabase();

    const updatedUserCredits = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { creditBalance: creditFee }},
      { new: true }
    )

    if(!updatedUserCredits) throw new Error("User credits update failed");

    return JSON.parse(JSON.stringify(updatedUserCredits));
  } catch (error) {
    handleError(error);
  }
}