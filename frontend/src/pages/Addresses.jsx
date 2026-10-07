import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardNav } from "@/components/DashboardNav";
import { listAddresses, createAddress, deleteAddress } from "@/api/addressApi";
import { ErrorMessage } from "@/components/ErrorMessage";
import { EmptyState } from "@/components/EmptyState";

export default function Addresses() {
  return (
    <ProtectedRoute>
      <AddressesContent />
    </ProtectedRoute>
  );
}

function AddressesContent() {
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("Home");
  const [fullAddress, setFullAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAddresses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listAddresses();
      setAddresses(data ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!fullAddress.trim()) return;
    setSaving(true);
    try {
      await createAddress({ full_name: title, address: fullAddress });
      setFullAddress("");
      setShowAdd(false);
      await fetchAddresses();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to remove this address?")) return;
    try {
      await deleteAddress(id);
      await fetchAddresses();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="gn-container py-12">
      <div className="flex items-center justify-between">
        <div>
          <span className="gn-eyebrow text-primary">Doorstep Visits</span>
          <h1 className="mt-1 font-display text-4xl text-foreground">Saved Addresses</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="gn-btn gn-btn-primary"
        >
          {showAdd ? "Cancel" : "+ Add New Address"}
        </button>
      </div>

      <div className="mt-6">
        <DashboardNav />
      </div>

      {showAdd ? (
        <form onSubmit={handleAdd} className="gn-card mt-6 p-6 border border-border max-w-xl space-y-4">
          <h3 className="font-bold text-lg">Add Delivery Address</h3>
          <div>
            <label className="gn-label block mb-1">Address Label</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Home, Office, Apartment"
              className="gn-input w-full"
            />
          </div>
          <div>
            <label className="gn-label block mb-1">Full Street Address</label>
            <textarea
              required
              rows={2}
              value={fullAddress}
              onChange={(e) => setFullAddress(e.target.value)}
              placeholder="House/Apt number, Street, Ward, City"
              className="gn-input w-full"
            />
          </div>
          <button type="submit" disabled={saving} className="gn-btn gn-btn-primary">
            {saving ? "Saving..." : "Save Address"}
          </button>
        </form>
      ) : null}

      <div className="mt-8 max-w-2xl">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="gn-card p-4 text-sm text-muted-foreground">
                Loading addresses...
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorMessage error={error} onRetry={fetchAddresses} />
        ) : addresses.length > 0 ? (
          <div className="space-y-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="gn-card flex items-center justify-between p-5 border border-border"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-location-dot text-primary" />
                    <h4 className="font-bold text-foreground">{addr.full_name ?? "Address"}</h4>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{addr.address}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(addr.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="fa-solid fa-location-dot"
            title="No addresses saved yet"
            description="Add your home or office address to book quick doorstep salon visits."
            actionLabel="+ Add Address"
            onAction={() => setShowAdd(true)}
          />
        )}
      </div>
    </div>
  );
}
