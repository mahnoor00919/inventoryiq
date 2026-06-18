// app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-indigo-500/30">
            IQ
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100">InventoryIQ</h1>
            <p className="text-xs text-gray-500">Smart Inventory Management</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
