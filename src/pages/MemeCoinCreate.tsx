import { CreateMemeCoin } from '@/components/CreateMemeCoin';
import { MemeCoinHeader } from '@/components/MemeCoinHeader';

export default function MemeCoinCreate() {
  return (
    <>
      <MemeCoinHeader />
      <div className="container mx-auto p-6">
        <CreateMemeCoin />
      </div>
    </>
  );
}