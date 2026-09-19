import { useEffect, useState } from "react";
import { getMyVendorProfile, updateMyVendorProfile } from "@/api/vendorApi";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { VendorNav } from "@/components/DashboardNav";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const emptyForm = {
  store_name: "",
  description: "",
  email: "",
  country: "",
  city: "",
  address: "",
  account_type: "Khalti",
  bank_name: "",
  account_number: "",
  account_name: "",
  khalti_id: "",
};

export default function VendorProfile() {
  return <ProtectedRoute requireUserType="Vendor"><VendorProfileContent /></ProtectedRoute>;
}

function VendorProfileContent() {
  const [form, setForm] = useState(emptyForm);
  const [profileImage, setProfileImage] = useState(null);
  const [verificationDocument, setVerificationDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    getMyVendorProfile()
      .then((profile) => setForm((current) => ({
        ...current,
        ...profile,
        ...(profile.bank_account ?? {}),
        address: profile.address ?? profile.user?.profile?.address ?? "",
      })))
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setError(null);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined) payload.append(key, value);
      });
      if (profileImage) payload.append("image", profileImage);
      if (verificationDocument) payload.append("document", verificationDocument);
      await updateMyVendorProfile(payload);
      setProfileImage(null);
      setVerificationDocument(null);
      setNotice("Store profile and verification details updated.");
    } catch (requestError) {
      setError(requestError);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading your store profile..." />;

  return (
    <div className="gn-container py-12">
      <p className="gn-eyebrow text-primary">Vendor Profile</p>
      <h1 className="mt-1 font-display text-4xl">Store profile</h1>
      <div className="mt-6"><VendorNav /></div>
      <form onSubmit={submit} className="gn-card mt-8 max-w-2xl space-y-4 border border-border p-6">
        {form.verification_status === "Rejected" ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <h2 className="font-bold">Verification rejected</h2>
            <p className="mt-1">Your documents or details were rejected. Please update the required information below and submit again for review.</p>
          </div>
        ) : !form.is_verified ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <h2 className="font-bold">Complete verification</h2>
            <p className="mt-1">Upload your company register certificate, business address, and payout bank details. An admin will review these details before your services can be published.</p>
          </div>
        ) : null}
        {notice ? <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</p> : null}
        {error ? <ErrorMessage error={error} /> : null}
        <label className="gn-label">Store name<input required className="gn-input mt-1.5 w-full" value={form.store_name} onChange={(event) => update("store_name", event.target.value)} /></label>
        <label className="gn-label">Description<textarea className="gn-input mt-1.5 w-full" rows="4" value={form.description || ""} onChange={(event) => update("description", event.target.value)} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="gn-label">Email<input type="email" className="gn-input mt-1.5 w-full" value={form.email || ""} onChange={(event) => update("email", event.target.value)} /></label>
          <label className="gn-label">City<input className="gn-input mt-1.5 w-full" value={form.city || ""} onChange={(event) => update("city", event.target.value)} /></label>
        </div>
        <label className="gn-label">Country<input className="gn-input mt-1.5 w-full" value={form.country || ""} onChange={(event) => update("country", event.target.value)} /></label>
        <label className="gn-label">Business address<textarea required={!form.is_verified} rows="3" className="gn-input mt-1.5 w-full" value={form.address || ""} onChange={(event) => update("address", event.target.value)} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="gn-label">Bank name<input required={!form.is_verified} className="gn-input mt-1.5 w-full" value={form.bank_name || ""} onChange={(event) => update("bank_name", event.target.value)} /></label>
          <label className="gn-label">Account number<input required={!form.is_verified} className="gn-input mt-1.5 w-full" value={form.account_number || ""} onChange={(event) => update("account_number", event.target.value)} /></label>
          <label className="gn-label">Account holder name<input required={!form.is_verified} className="gn-input mt-1.5 w-full" value={form.account_name || ""} onChange={(event) => update("account_name", event.target.value)} /></label>
          <label className="gn-label">Payment account type<select className="gn-input mt-1.5 w-full" value={form.account_type || "Khalti"} onChange={(event) => update("account_type", event.target.value)}><option value="Khalti">Khalti</option></select></label>
        </div>
        <label className="gn-label">Company register certificate<input type="file" accept="image/*" required={!form.is_verified} className="gn-input mt-1.5 w-full" onChange={(event) => setVerificationDocument(event.target.files?.[0] ?? null)} /></label>
        <label className="gn-label">Store photo<input type="file" accept="image/*" className="gn-input mt-1.5 w-full" onChange={(event) => setProfileImage(event.target.files?.[0] ?? null)} /></label>
        <button disabled={busy} className="gn-btn gn-btn-primary">{busy ? "Saving..." : "Save Store Profile"}</button>
      </form>
    </div>
  );
}
