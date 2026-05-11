export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-gray-500">Productos</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-gray-500">Ventas hoy</p>
          <p className="text-2xl font-bold">Bs 0</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-gray-500">Stock bajo</p>
          <p className="text-2xl font-bold text-red-500">0</p>
        </div>
      </div>
    </div>
  );
}
