import { MeetingRecorder } from "@/components/MeetingRecorder";
import { getPublicEnvStatus } from "@/lib/env";

export default function Home() {
  const backendStatus = getPublicEnvStatus();

  return <MeetingRecorder backendStatus={backendStatus} />;
}
