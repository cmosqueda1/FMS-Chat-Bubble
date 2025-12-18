/*
  Resolve entity type from search-all response.
  Never assume input == result.
*/
export function resolveSearchResult({ keyword, counts, entities }) {
  if (counts.trips === 1) {
    return {
      type: "TRIP",
      tripNo: entities.trips[0].tripNo
    };
  }

  if (counts.orders === 1) {
    return {
      type: "PRO",
      pro: entities.orders[0].pro,
      do: entities.orders[0].do
    };
  }

  // PU resolves to PRO via linehaul
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
