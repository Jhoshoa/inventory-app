export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-8">Inventory App</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" className="w-full border border-gray-300 rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input type="password" className="w-full border border-gray-300 rounded-lg p-2" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white rounded-lg p-2 font-semibold">
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}
