/*
  Determines what the search-all response represents.
  Response-driven — never assume based on input.
*/
export function resolveSearchResult({ keyword, entities, counts }) {
  // Single Trip hit
  if (counts.trips === 1) {
    return {
      type: "TRIP",
      tripNo: entities.trips[0].tripNo
    };
  }

  // Single Order / PRO hit
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
