import {
  Ctx,
  ArgsType,
  Args,
  Resolver,
  ObjectType,
  Field,
  Query,
  Authorized
} from "type-graphql";
import { ContextType } from "./index";
import { UserApi, UserApiApiKeys } from "./typescript-node-client/api";

@ObjectType()
export class User {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  firstName!: string;

  @Field(() => String)
  lastName!: string;

  @Field(() => String)
  email!: string;

  @Field(() => String)
  avatarUrl!: string;

  @Field(() => Number)
  age!: number;
}

@Resolver()
export class UserResolver {
  @Query(() => [User])
  @Authorized()
  async users(@Ctx() ctx: ContextType): Promise<User[]> {
    const userApi = new UserApi();
    userApi.setApiKey(UserApiApiKeys.JWT, ctx.token);

    const { currentOrganisationId } = ctx.user;
    const { body }: { body: unknown[] } = await userApi.userGet(
      currentOrganisationId
    );

    return body as User[];
  }
}
