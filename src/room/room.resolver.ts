import { Ctx, Arg, Resolver, Query, Authorized } from "type-graphql";
import { ContextType } from "../index";
import {
  InstallationLocationApi,
  InstallationLocationApiApiKeys,
  DeviceAssignmentApi,
  DeviceAssignmentApiApiKeys,
  DeviceAssignment,
  Sample
} from "../../typescript-node-client/api";
import { Room, LocationSamplePairing } from "./room.view-model";

@Resolver()
export class RoomResolver {
  @Query(() => [Room])
  @Authorized()
  async rooms(
    @Arg("installationId") installationId: string,
    @Ctx() ctx: ContextType
  ): Promise<Room[]> {
    const installationLocationApi = new InstallationLocationApi();
    installationLocationApi.setApiKey(
      InstallationLocationApiApiKeys.JWT,
      ctx.token
    );

    const deviceAssignmentApi = new DeviceAssignmentApi();
    deviceAssignmentApi.setApiKey(DeviceAssignmentApiApiKeys.JWT, ctx.token);

    const {
      body: installationLocations
    } = await installationLocationApi.installationlocationGet(installationId);

    const rooms: Room[] = await Promise.all(
      installationLocations.map(
        (installationLocation): Promise<Room> =>
          Promise.all([
            installationLocationApi
              .installationlocationIdSamplesLatestGet(installationLocation.id)
              .then(({ body }) => body),
            deviceAssignmentApi
              .deviceassignmentGet(installationLocation.id)
              .then(({ body }) => body[0])
          ]).then(
            ([latestSample, deviceAssignment]: [
              Sample,
              DeviceAssignment
            ]): Room => {
              const locationSamplePairing: LocationSamplePairing = {
                deviceLastSeenAt: latestSample
                  ? parseInt(latestSample.timestamp)
                  : null,
                sample: latestSample ? latestSample.sample : null,
                installationLocation,
                signalStrength: null,
                isDeviceAssigned: deviceAssignment !== null,
                deviceId: deviceAssignment ? deviceAssignment.deviceId : null
              };

              return Room.fromLocationSamplePairing(locationSamplePairing);
            }
          )
      )
    );

    return rooms;
  }
}
