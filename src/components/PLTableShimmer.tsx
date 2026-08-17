export function PLTableShimmer() {
  const rows = Array.from({ length: 14 }, (_, index) => index);
  const cols = Array.from({ length: 8 }, (_, index) => index);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300">
      <div className="overflow-auto max-h-[calc(100vh-220px)]">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-orange-200">
              <th className="min-w-[360px] border-b border-r border-gray-300 px-3 py-3">
                <div className="shimmer h-4 w-48 rounded" />
              </th>
              {cols.map((col) => (
                <th
                  key={col}
                  className="min-w-[130px] border-b border-gray-300 px-3 py-3"
                >
                  <div className="shimmer ml-auto h-4 w-16 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row}
                className={
                  row === 5 ? "bg-emerald-50" : row % 2 === 0 ? "bg-sky-50" : "bg-white"
                }
              >
                <td className="border-b border-r border-gray-200 px-3 py-2.5">
                  <div
                    className="shimmer h-3.5 rounded"
                    style={{ width: `${row === 5 ? 180 : 220 - (row % 5) * 18}px` }}
                  />
                </td>
                {cols.map((col) => (
                  <td key={col} className="border-b border-gray-200 px-3 py-2.5">
                    <div className="shimmer ml-auto h-3.5 w-20 rounded" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
