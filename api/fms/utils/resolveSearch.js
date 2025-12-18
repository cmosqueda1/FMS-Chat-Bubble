/*
  Determines the resolved entity type
  based ONLY on the search-all response
*/
export function resolveSearchResult({ keyword, counts, entities }) {
  // Exact Trip hit
  if (counts.trips === 1) {
    return {
      type: "TRIP",
      tripNo: entities.trips[0].tripNo
    };
  }

  // Exact Order / PRO hit
  if (counts.orders === 1) {
    return {
      type: "PRO",
      pro: entities.orders[0].pro,
      do: entities.orders[0].do
    };
  }

  // PU resolved via linehaul → PRO
  if (counts.linehaulTasks === 1) {
    return {
      type: "PRO",
      pro: entities.linehaulTasks[0].pro,
      taskNo: entities.linehaulTasks[0].taskNo
    };
  }

  return {
    type: "UNKNOWN",
    keyword,
    counts
  };
}
