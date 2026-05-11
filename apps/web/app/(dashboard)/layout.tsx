export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r p-4">
        <h2 className="text-lg font-bold mb-6">Inventory App</h2>
        <nav className="space-y-2">
          <a href="/dashboard" className="block p-2 rounded hover:bg-gray-100">Dashboard</a>
          <a href="/dashboard/products" className="block p-2 rounded hover:bg-gray-100">Productos</a>
          <a href="/dashboard/sales" className="block p-2 rounded hover:bg-gray-100">Ventas</a>
          <a href="/dashboard/reports" className="block p-2 rounded hover:bg-gray-100">Reportes</a>
          <a href="/dashboard/settings" className="block p-2 rounded hover:bg-gray-100">Ajustes</a>
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
