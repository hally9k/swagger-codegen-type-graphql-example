import "reflect-metadata";
import { ApolloServer } from "apollo-server";
import * as path from "path";
import { buildSchema, AuthChecker } from "type-graphql";
import { UserResolver } from "./user";
import { AuthResolver } from "./auth";
import { InstallationResolver } from "./installation";
import { RoomResolver } from "./room/room.resolver";
import { Request } from "express";
import decode from "jwt-decode";

interface UserContext {
  userId: UUID;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: null;
  currentOrganisationId: UUID;
  currentOrganisationRoleName: "Account Owner" | "User" | "Tenant" | "Admin";
  currentOrganisationRoleId: number;
  organisations: OrganisationContext[];
}

interface OrganisationContext {
  id: UUID;
  userRoleId: number;
}

export interface ContextType {
  token: string | null;
  user: UserContext | null;
}

const customAuthChecker: AuthChecker<ContextType> = (
  { root, args, context, info },
  roles
) => {
  // here we can read the user from context
  // and check his permission in the db against the `roles` argument
  // that comes from the `@Authorized` decorator, eg. ["ADMIN", "MODERATOR"]

  return Boolean(context.token);
};

function createContext({ req }: { req: Request }) {
  const token = req.headers.authorization;
  return {
    req,
    token: token ? token.replace(/bearer\ /i, "") : null,
    user: token ? decode(token) : null
  };
}

async function bootstrap(resolvers, port) {
  // build TypeGraphQL executable schema
  const schema = await buildSchema({
    resolvers: [AuthResolver, InstallationResolver, UserResolver, RoomResolver],
    emitSchemaFile: path.resolve(__dirname, "../schema.graphql"),
    authChecker: customAuthChecker
  });

  // Create GraphQL server
  const server = new ApolloServer({
    schema,
    playground: true,
    context: createContext
  });

  // Start the server
  const { url } = await server.listen(4000);
  console.log(`🚀 Server is running, GraphQL Playground available at ${url}`);
}

bootstrap();
