import type { DefaultSession } from "next-auth";
import type { UserAppRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserAppRole;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserAppRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserAppRole;
  }
}
