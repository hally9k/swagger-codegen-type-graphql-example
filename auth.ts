import {
  Args,
  ArgsType,
  Resolver,
  ObjectType,
  Field,
  Mutation
} from "type-graphql";
import { MaxLength, MinLength, IsEmail } from "class-validator";
import { AuthApi } from "./typescript-node-client/api";

@ObjectType()
export class Auth {
  @Field(() => String)
  token!: string;
}

@ArgsType()
class LoginArgs {
  @Field(type => String)
  @IsEmail()
  email!: string;

  @Field(type => String)
  @MaxLength(255)
  @MinLength(2)
  password!: string;
}

@Resolver()
export class AuthResolver {
  @Mutation(returns => Auth)
  async login(@Args() { email, password }: LoginArgs): Promise<Auth> {
    const authApi = new AuthApi();

    const { body } = await authApi.authLoginPost({
      email,
      password
    });

    return { token: body.token } as Auth;
  }
}
