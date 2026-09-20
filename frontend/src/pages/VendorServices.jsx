import { useEffect, useState } from "react";
import { createCategory, vendorServiceApi, listCategories } from "@/api/serviceApi";
import { getMyVendorProfile } from "@/api/vendorApi";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const emptyForm = { title: "", description: "", price: "", discount_price: "", duration_minutes: 60, service_type: "Store", category_id: "", status: "Draft" };

export default function VendorServices() {
  return <ProtectedRoute requireUserType="Vendor"><VendorServicesContent /></ProtectedRoute>;
}

function VendorServicesContent() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [thumbnail, setThumbnail] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState("");
  const [isVerified, setIsVerified] = useState(true);
  const [editingSid, setEditingSid] = useState(null);
  const [categoryTitle, setCategoryTitle] = useState("");
  const [categoryImage, setCategoryImage] = useState(null);
  const [categoryBusy, setCategoryBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profile, serviceData, categoryData] = await Promise.all([
        getMyVendorProfile(),
        vendorServiceApi.list(),
        listCategories(),
      ]);
      const verified = Boolean(profile?.is_verified);
      setIsVerified(verified);
      if (!verified) {
        setNotice("Your vendor account is not verified yet. Draft services can be saved until admin verification.");
      }
      setServices(serviceData);
      setCategories(categoryData);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const addCategory = async (event) => {
    event.preventDefault();
    if (!categoryTitle.trim()) return;
    setCategoryBusy(true);
    setError(null);
    try {
      const categoryPayload = new FormData();
      categoryPayload.append("title", categoryTitle.trim());
      if (categoryImage) categoryPayload.append("image", categoryImage);
      const category = await createCategory(categoryPayload);
      setCategories((current) => [...current, category].sort((first, second) => first.title.localeCompare(second.title)));
      setForm((current) => ({ ...current, category_id: String(category.id) }));
      setCategoryTitle("");
      setCategoryImage(null);
      setNotice("Category created successfully.");
    } catch (requestError) {
      setError(requestError);
    } finally {
      setCategoryBusy(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setError(null);
    try {
      const payload = new FormData();
      payload.append("title", form.title);
      payload.append("description", form.description);
      payload.append("price", String(Number(form.price)));
      payload.append("duration_minutes", String(Number(form.duration_minutes)));
      if (form.discount_price) payload.append("discount_price", String(Number(form.discount_price)));
      if (form.category_id) payload.append("category_id", form.category_id);
      payload.append("service_type", form.service_type);
      payload.append("status", form.status);
      if (thumbnail) payload.append("thumbnail", thumbnail);
      gallery.forEach((file) => payload.append("gallery", file));
      if (editingSid) {
        await vendorServiceApi.update(editingSid, payload);
      } else {
        await vendorServiceApi.create(payload);
      }
      setForm(emptyForm);
      setThumbnail(null);
      setGallery([]);
      setEditingSid(null);
      setNotice(editingSid ? "Service updated successfully." : "Service saved successfully.");
      await load();
    } catch (requestError) {
      if (requestError?.status === 403) {
        const message = "Your vendor account is not verified yet. Your service will be listed when your account is verified by the admin.";
        window.alert(message);
        setNotice(message);
      }
      setError(requestError);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading your services..." />;

  return (
    <div className="gn-container py-12">
      {notice ? (
        <div className="fixed right-5 top-5 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-xl" role="status">
          <i className="fa-solid fa-circle-check mt-0.5" aria-hidden="true" />
          <span>{notice}</span>
          <button type="button" className="ml-2 text-emerald-500 hover:text-emerald-800" onClick={() => setNotice("")} aria-label="Close message">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      <p className="gn-eyebrow text-primary">Vendor Services</p>
      <h1 className="mt-1 font-display text-4xl text-foreground">List and manage services</h1>
      {error ? <div className="mt-6"><ErrorMessage error={error} onRetry={load} /></div> : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.25fr]">
        <form onSubmit={submit} className="gn-card space-y-4 border border-border p-6">
          <h2 className="font-display text-2xl">List a new service</h2>
          {!isVerified && notice ? <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">{notice}</p> : null}
          <div className="text-xs text-muted-foreground">{isVerified ? "Your store is verified and can publish services." : "You can save drafts now. Publishing is available after admin verification."}</div>
          <label className="gn-label">Service title<input required className="gn-input mt-1.5 w-full" value={form.title} onChange={(event) => update("title", event.target.value)} /></label>
          <label className="gn-label">Description<textarea required className="gn-input mt-1.5 w-full" rows="4" value={form.description} onChange={(event) => update("description", event.target.value)} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="gn-label">Price<input required type="number" min="0" step="0.01" className="gn-input mt-1.5 w-full" value={form.price} onChange={(event) => update("price", event.target.value)} /></label>
            <label className="gn-label">Discount price<input type="number" min="0" step="0.01" className="gn-input mt-1.5 w-full" value={form.discount_price} onChange={(event) => update("discount_price", event.target.value)} /></label>
          </div>
          <label className="gn-label">Service duration (minutes)<input required type="number" min="1" step="1" className="gn-input mt-1.5 w-full" value={form.duration_minutes} onChange={(event) => update("duration_minutes", event.target.value)} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="gn-label">Category<select className="gn-input mt-1.5 w-full" value={form.category_id} onChange={(event) => update("category_id", event.target.value)}><option value="">Choose category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label>
            <label className="gn-label">Service type<select className="gn-input mt-1.5 w-full" value={form.service_type} onChange={(event) => update("service_type", event.target.value)}><option value="Store">Store visit</option><option value="Home">Home visit</option><option value="Both">Home and store</option></select></label>
          </div>
          <div className="rounded-xl border border-border bg-secondary/20 p-3">
            <label className="gn-label">Create a category<input className="gn-input mt-1.5 w-full" value={categoryTitle} onChange={(event) => setCategoryTitle(event.target.value)} placeholder="e.g. Hair Care" /></label>
            <label className="gn-label mt-2">Category photo<input type="file" accept="image/*" className="gn-input mt-1.5 w-full" onChange={(event) => setCategoryImage(event.target.files?.[0] ?? null)} /></label>
            <button type="button" onClick={addCategory} disabled={categoryBusy || !categoryTitle.trim()} className="gn-btn gn-btn-outline mt-2">{categoryBusy ? "Creating..." : "Create Category"}</button>
          </div>
          <label className="gn-label">Visibility<select className="gn-input mt-1.5 w-full" value={form.status} onChange={(event) => update("status", event.target.value)}><option value="Draft">Save as draft</option><option value="Published">Publish now</option></select></label>
          <label className="gn-label">Service thumbnail<input type="file" accept="image/*" className="gn-input mt-1.5 w-full" onChange={(event) => setThumbnail(event.target.files?.[0] ?? null)} /></label>
          <label className="gn-label">Gallery photos<input type="file" accept="image/*" multiple className="gn-input mt-1.5 w-full" onChange={(event) => setGallery(Array.from(event.target.files ?? []))} /></label>
          <button disabled={busy} className="gn-btn gn-btn-primary w-full">{busy ? "Saving..." : editingSid ? "Update Service" : "Save Service"}</button>
        </form>

        <section>
          <h2 className="font-display text-2xl">Your services ({services.length})</h2>
          <div className="mt-4 space-y-3">
            {services.map((service) => <article key={service.sid} className="gn-card flex flex-wrap items-center justify-between gap-4 border border-border p-5"><div className="min-w-0"><h3 className="truncate font-bold">{service.title}</h3><p className="mt-1 text-sm text-muted-foreground">{service.category_name || "Uncategorised"} · {service.duration_minutes ?? 60} minutes · Rs. {service.effective_price} · {service.booking_count ?? 0} bookings</p></div><div className="flex shrink-0 items-center gap-2"><span className="gn-badge bg-secondary text-secondary-foreground">{service.status}</span><button type="button" title={`Edit ${service.title}`} aria-label={`Edit ${service.title}`} onClick={() => { setEditingSid(service.sid); setForm({ title: service.title ?? "", description: service.description ?? "", price: service.price ?? "", discount_price: service.discount_price ?? "", duration_minutes: service.duration_minutes ?? 60, service_type: service.service_type ?? "Store", category_id: service.category?.id ?? "", status: service.status ?? "Draft" }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 text-primary transition hover:bg-primary hover:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"><i className="fa-solid fa-pen-to-square" aria-hidden="true" /></button><button type="button" title={`Delete ${service.title}`} aria-label={`Delete ${service.title}`} onClick={async () => { if (!window.confirm(`Delete ${service.title}? This cannot be undone.`)) return; try { await vendorServiceApi.remove(service.sid); await load(); } catch (requestError) { setError(requestError); } }} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-300"><i className="fa-solid fa-trash-can" aria-hidden="true" /></button></div></article>)}
            {!services.length ? <div className="gn-card border border-border p-8 text-center text-muted-foreground">Create your first service to start receiving bookings.</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
