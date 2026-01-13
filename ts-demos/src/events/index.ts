import { SuiClient, EventId } from "@mysten/sui/client";
const client = new SuiClient({ url: "https://fullnode.mainnet.sui.io" });

// 查询最新的事件
export async function getLatestEvents(eventType: string) {
  const events = await client.queryEvents({
    query: {
      MoveEventType: eventType,
    },
    limit: 50, // 每次查询最多50个事件
    order: "descending", // 最新的事件在前
  });

  return events.data || [];
}

export async function getEventById(eventId: EventId) {
  const events = await client.queryEvents({
    query: {
      Transaction: eventId.txDigest,
    },
  });

  const eventsDataLength = events.data.length;
  if (eventsDataLength == 0) return null;

  const targetIdx = Number(eventId.eventSeq);
  if (targetIdx >= eventsDataLength) return null;

  const targetEventData = events.data[targetIdx];

  return targetEventData;
}

// async function getAllObligationCreatedEvents(packageId: string) {
//     const allEvents = [];
//     let cursor = null;
//     let hasNextPage = true;

//     while (hasNextPage) {
//         const result = await client.queryEvents({
//             query: {
//                 MoveEventType: `${packageId}::open_obligation::ObligationCreatedEvent`
//             },
//             cursor,
//             limit: 50,
//             order: 'ascending'
//         });

//         allEvents.push(...result.data);

//         if (result.hasNextPage && result.nextCursor) {
//             cursor = result.nextCursor;
//         } else {
//             hasNextPage = false;
//         }
//     }

//     return allEvents;
// }
