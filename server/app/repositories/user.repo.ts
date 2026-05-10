import { prisma } from "../libs/prisma";
import type { Prisma } from '../../generated/prisma/client';

export const findByEmail = async (email: string) => {
  return prisma.users.findUnique({
    where: { email },
  });
};

export const findById = async (id: number) => {
  return prisma.users.findUnique({
    where: { id },
  });
};

export const findByResetToken = async (hashedToken: string, currentDate: Date) => {
  return prisma.users.findFirst({
    where: {
      reset_password_token: hashedToken,
      reset_password_expires: {
        gt: currentDate,
      },
    },
  });
};

export const create = async (data: Prisma.usersCreateInput) => {
  return prisma.users.create({
    data,
    select: { id: true, full_name: true, email: true, role: true },
  });
};

export const update = async (id: number, data: Prisma.usersUpdateInput) => {
  return prisma.users.update({
    where: { id },
    data,
  });
};