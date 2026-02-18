import { PublicKey } from "@solana/web3.js";

export function decodeCapsuleState(buffer: any) {
  let offset = 8; // descriminator

  const creator = new PublicKey(buffer.slice(offset, offset + 32));
  offset += 32;

  const unlock_time = buffer.readBigInt64LE(offset);
  offset += 8;

  const cid_len = buffer.readUInt32LE(offset);
  offset += 4;
  const cid = buffer.slice(offset, offset + cid_len).toString("utf8");
  offset += cid_len;

  const reward_amount = buffer.readBigUInt64LE(offset);
  offset += 8;

  const title_len = buffer.readUInt32LE(offset);
  offset += 4;
  const title = buffer.slice(offset, offset + title_len).toString("utf8");
  offset += title_len;

  const desc_len = buffer.readUInt32LE(offset);
  offset += 4;
  const description = buffer.slice(offset, offset + desc_len).toString("utf8");
  offset += desc_len;

  const is_unlocked = buffer[offset] === 1;
  offset += 1;

  const is_private = buffer[offset] === 1;
  offset += 1;

  const bump = buffer[offset];
  offset += 1;

  const index = buffer.readBigUInt64LE(offset);
  offset += 8;

  return {
    creator: creator.toBase58(),
    unlock_time: Number(unlock_time),
    cid,
    reward_amount: reward_amount.toString(),
    title,
    description,
    is_unlocked,
    is_private,
    bump,
    index: index.toString(),
  };
}
