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
import {
  InstallationApi,
  InstallationApiApiKeys,
  Installation as InstallationResponse
} from "../typescript-node-client/api";

@ObjectType()
class Location {
  @Field()
  longitude: number;

  @Field()
  latitude: number;
}

interface IInstallation {
  id: string;
  type: string;
  organisationId: UUID;
  address: string;
  location: Location;
  accessCode: string;
  customPropertyId: string;
}

@ObjectType()
export class Installation {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  type!: string;

  @Field(() => String)
  organisationId!: UUID;

  @Field(() => String)
  address!: string;

  @Field(() => Location)
  location!: Location;

  @Field(() => String)
  accessCode!: string;

  @Field(() => String, { nullable: true })
  customPropertyId?: string;

  constructor({
    id,
    type,
    organisationId,
    address,
    location,
    accessCode,
    customPropertyId
  }: IInstallation) {
    this.id = id;
    this.type = type;
    this.organisationId = organisationId;
    this.address = address;
    this.location = location;
    this.accessCode = accessCode;
    this.customPropertyId = customPropertyId;
  }

  static fromInstallationResponse(installationResponse: InstallationResponse) {
    const {
      id,
      type,
      organisationId,
      address1,
      address2,
      addressCity,
      addressCountry,
      addressPostcode,
      latitude,
      longitude,
      accessCode,
      customPropertyId
    } = installationResponse;

    return new Installation({
      id,
      type,
      organisationId,
      address: `${address1} ${address2} ${addressCity} ${addressCountry} ${addressPostcode}`,
      location:
        longitude && latitude
          ? {
              longitude: parseFloat(longitude),
              latitude: parseFloat(latitude)
            }
          : null,
      accessCode,
      customPropertyId
    });
  }
}

@Resolver()
export class InstallationResolver {
  @Query(() => [Installation])
  @Authorized()
  async installations(@Ctx() ctx: ContextType): Promise<Installation[]> {
    const installationApi = new InstallationApi();
    installationApi.setApiKey(InstallationApiApiKeys.JWT, ctx.token);

    const { currentOrganisationId } = ctx.user;
    const { body }: { body: unknown[] } = await installationApi.installationGet(
      currentOrganisationId
    );

    const installations: Installation[] = body.map(
      Installation.fromInstallationResponse
    );

    return installations;
  }
}
