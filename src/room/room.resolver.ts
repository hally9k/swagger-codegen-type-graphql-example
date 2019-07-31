import {
  Ctx,
  Arg,
  Resolver,
  ObjectType,
  Field,
  Query,
  Authorized
} from "type-graphql";
import { ContextType } from "../index";
import {
  InstallationLocationApi,
  InstallationLocationApiApiKeys,
  InstallationLocation,
  DeviceAssignmentApi,
  DeviceAssignmentApiApiKeys,
  DeviceAssignment,
  Sample
} from "../../typescript-node-client/api";
import moment from "moment";
import numeral from "numeral";

export enum SampleKey {
  temperature = "temperature",
  dewpoint = "dewpoint",
  humidity = "humidity",
  co2 = "co2",
  tvoc = "tvoc",
  light = "light",
  status = "status",
  pressure = "pressure",
  battery = "battery",
  kilowattHours = "kilowattHours"
}

export interface IRawSample {
  type?: number;
  [SampleKey.battery]?: number;
  [SampleKey.temperature]?: number;
  [SampleKey.humidity]?: number;
  [SampleKey.light]?: number;
  [SampleKey.pressure]?: number;
  [SampleKey.co2]?: number;
  [SampleKey.tvoc]?: number;
  [SampleKey.status]?: number;
  [SampleKey.dewpoint]?: number;
  [SampleKey.kilowattHours]?: number;
}

export interface ILatestSample {
  deviceId?: string;
  timestamp?: number;
  sample?: IRawSample;
}

export interface LocationSamplePairing {
  installationLocation: InstallationLocation;
  sample: IRawSample | null;
  deviceLastSeenAt: number | null;
  isDeviceAssigned?: boolean;
  signalStrength: SignalStrength;
  deviceId: string | null;
}

export type SignalStrength = 1 | 2 | 3 | 4 | 5 | null;

@ObjectType()
export class Room {
  @Field(() => String)
  readonly temperature: string;
  @Field(() => String)
  readonly humidity: string;
  @Field(() => String)
  readonly co2: string;
  @Field(() => String)
  readonly tvoc: string;
  @Field(() => String)
  readonly pressure: string;
  @Field(() => String)
  readonly battery: string;
  @Field(() => String)
  readonly name: string;
  @Field(() => String)
  readonly color: string;
  @Field(() => String)
  readonly deviceLastSeenAt: string | null;
  @Field(() => String)
  readonly installationLocationId: string;
  @Field(() => Boolean)
  readonly isDeviceAssigned: boolean;
  @Field(() => Boolean)
  readonly isDeviceMissing: boolean;
  @Field(() => Number)
  readonly signalStrength: SignalStrength;

  constructor(room) {
    this.temperature = room.temperature;
    this.humidity = room.humidity;
    this.co2 = room.co2;
    this.tvoc = room.tvoc;
    this.pressure = room.pressure;
    this.battery = room.battery;
    this.name = room.name;
    this.color = room.color;
    this.deviceLastSeenAt = room.deviceLastSeenAt;
    this.installationLocationId = room.installationLocationId;
    this.isDeviceAssigned = room.isDeviceAssigned;
    this.isDeviceMissing = room.isDeviceMissing;
    this.signalStrength = room.signalStrength;
  }

  static fromLocationSamplePairing({
    installationLocation,
    sample,
    deviceLastSeenAt,
    isDeviceAssigned,
    signalStrength
  }: LocationSamplePairing) {
    return new Room({
      name: installationLocation.name,
      color: installationLocation.color,
      deviceLastSeenAt: deviceLastSeenAt
        ? moment(deviceLastSeenAt).fromNow()
        : null,
      installationLocationId: installationLocation.id,
      isDeviceAssigned,
      isDeviceMissing: Room.getIsDeviceMissing(
        isDeviceAssigned,
        deviceLastSeenAt
      ),
      signalStrength,
      temperature: Room.getDisplayValue(sample, SampleKey.temperature, "°C"),
      humidity: Room.getDisplayValue(sample, SampleKey.humidity, "%"),
      co2: Room.getDisplayValue(sample, SampleKey.co2, "ppm"),
      tvoc: Room.getDisplayValue(sample, SampleKey.tvoc, "iaq"),
      pressure: Room.getDisplayValue(sample, SampleKey.pressure),
      battery: Room.getDisplayValue(sample, SampleKey.battery, "%")
    });
  }

  private static getDisplayValue(
    sample: IRawSample | null,
    key: SampleKey,
    suffix: string = ""
  ): string {
    if (!sample || sample[key] === null || sample[key] === undefined) {
      return "N/A";
    }

    return `${numeral(sample[key]).format("0,0[.]00")}${suffix}`;
  }

  static getIsDeviceMissing(
    isDeviceAssigned: boolean,
    deviceLastSeenAt: number
  ) {
    if (!isDeviceAssigned || !deviceLastSeenAt) {
      return true;
    }

    const now = moment();
    const lastSeen = moment(deviceLastSeenAt);
    const duration = moment.duration(now.diff(lastSeen));
    return duration.asMinutes() > 120;
  }
}

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
