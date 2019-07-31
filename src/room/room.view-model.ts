import { ObjectType, Field } from "type-graphql";
import { InstallationLocation } from "../../typescript-node-client/api";
import moment from "moment";
import numeral from "numeral";

enum SampleKey {
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

interface IRawSample {
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

interface ILatestSample {
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

type SignalStrength = 1 | 2 | 3 | 4 | 5 | null;

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
  @Field(() => String, { nullable: true })
  readonly deviceLastSeenAt: string | null;
  @Field(() => String)
  readonly installationLocationId: string;
  @Field(() => Boolean)
  readonly isDeviceAssigned: boolean;
  @Field(() => Boolean)
  readonly isDeviceMissing: boolean;
  @Field(() => Number, { nullable: true })
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
