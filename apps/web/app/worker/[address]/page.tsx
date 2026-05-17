import { ProfilePage } from "@/components/profile-page";

export default function WorkerProfilePage({ params }: { params: { address: string } }) {
  return <ProfilePage kind="worker" address={params.address} />;
}
