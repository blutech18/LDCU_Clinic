import { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, X, AlertTriangle, RefreshCw, Save, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '~/lib/supabase';
import { logUserAction } from '~/lib/auditLog';
import type { Campus } from '~/types';

export function CampusManagementPage() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal (first confirmation)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [campusToDelete, setCampusToDelete] = useState<Campus | null>(null);
  // Delete modal (second/final confirmation)
  const [isFinalDeleteOpen, setIsFinalDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit confirmation (first step before saving)
  const [isEditConfirmOpen, setIsEditConfirmOpen] = useState(false);
  const [isFinalEditOpen, setIsFinalEditOpen] = useState(false);
  const [pendingEditData, setPendingEditData] = useState<{ name: string; address: string } | null>(null);

  // Add confirmation (double confirm for create too)
  const [isAddConfirmOpen, setIsAddConfirmOpen] = useState(false);
  const [isFinalAddOpen, setIsFinalAddOpen] = useState(false);

  useEffect(() => {
    fetchCampuses();
  }, []);

  const fetchCampuses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('campuses').select('*').order('name');
      if (error) throw error;
      setCampuses(data || []);
    } catch (error) {
      console.error('Error fetching campuses:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Open modals ──
  const openAddModal = () => {
    setEditingCampus(null);
    setFormName('');
    setFormAddress('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (campus: Campus) => {
    setEditingCampus(campus);
    setFormName(campus.name);
    setFormAddress(campus.address || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openDeleteModal = (campus: Campus) => {
    setCampusToDelete(campus);
    setIsDeleteModalOpen(true);
  };

  // ── Save flow (double confirmation) ──
  const handleFormSubmit = () => {
    if (!formName.trim()) {
      setFormError('Campus name is required');
      return;
    }
    setFormError(null);
    setIsModalOpen(false);

    if (editingCampus) {
      setPendingEditData({ name: formName.trim(), address: formAddress.trim() });
      setIsEditConfirmOpen(true);
    } else {
      setIsAddConfirmOpen(true);
    }
  };

  // ── CREATE: double confirm ──
  const handleAddFirstConfirm = () => {
    setIsAddConfirmOpen(false);
    setIsFinalAddOpen(true);
  };

  const handleAddFinalConfirm = async () => {
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('campuses')
        .insert({ name: formName.trim(), address: formAddress.trim() || null })
        .select()
        .single();
      if (error) throw error;

      await logUserAction({
        action: 'CREATE',
        resourceType: 'campus',
        resourceId: data.id,
        details: { campus_name: data.name, campus_address: data.address },
      });

      setCampuses((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setIsFinalAddOpen(false);
    } catch (error: any) {
      console.error('Error creating campus:', error);
      alert('Failed to create campus. Please try again.');
      setIsFinalAddOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  // ── UPDATE: double confirm ──
  const handleEditFirstConfirm = () => {
    setIsEditConfirmOpen(false);
    setIsFinalEditOpen(true);
  };

  const handleEditFinalConfirm = async () => {
    if (!editingCampus || !pendingEditData) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('campuses')
        .update({ name: pendingEditData.name, address: pendingEditData.address || null })
        .eq('id', editingCampus.id);
      if (error) throw error;

      await logUserAction({
        action: 'UPDATE',
        resourceType: 'campus',
        resourceId: editingCampus.id,
        details: {
          old_name: editingCampus.name,
          new_name: pendingEditData.name,
          old_address: editingCampus.address,
          new_address: pendingEditData.address,
        },
      });

      setCampuses((prev) =>
        prev
          .map((c) => (c.id === editingCampus.id ? { ...c, name: pendingEditData.name, address: pendingEditData.address || undefined } : c))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setIsFinalEditOpen(false);
      setPendingEditData(null);
      setEditingCampus(null);
    } catch (error: any) {
      console.error('Error updating campus:', error);
      alert('Failed to update campus. Please try again.');
      setIsFinalEditOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  // ── DELETE: double confirm ──
  const handleDeleteFirstConfirm = () => {
    setIsDeleteModalOpen(false);
    setIsFinalDeleteOpen(true);
  };

  const handleDeleteFinalConfirm = async () => {
    if (!campusToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('campuses').delete().eq('id', campusToDelete.id);
      if (error) throw error;

      await logUserAction({
        action: 'DELETE',
        resourceType: 'campus',
        resourceId: campusToDelete.id,
        details: { campus_name: campusToDelete.name },
      });

      setCampuses((prev) => prev.filter((c) => c.id !== campusToDelete.id));
      setIsFinalDeleteOpen(false);
      setCampusToDelete(null);
    } catch (error: any) {
      console.error('Error deleting campus:', error);
      alert('Failed to delete campus. It may have related data (departments, appointments, etc.).');
      setIsFinalDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campus Management</h1>
          <p className="text-gray-600 mt-1">Add, edit, or remove campuses</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-maroon-800 text-white text-sm font-medium rounded-lg hover:bg-maroon-900 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Add Campus
          </button>
          <button onClick={fetchCampuses} className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Campus Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Campus Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Address</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Created</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campuses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No campuses found. Click "Add Campus" to create one.</td>
                </tr>
              ) : (
                campuses.map((campus) => (
                  <tr key={campus.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-maroon-50 text-maroon-700 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{campus.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600 hidden sm:table-cell">{campus.address || <span className="text-gray-400 italic">No address</span>}</td>
                    <td className="px-4 py-3.5 text-center text-sm text-gray-500 hidden sm:table-cell">
                      {new Date(campus.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEditModal(campus)} className="p-1.5 text-gray-400 hover:text-maroon-700 hover:bg-maroon-50 rounded-full transition-colors" title="Edit campus">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => openDeleteModal(campus)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Delete campus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add/Edit Form Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', duration: 0.3 }} className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-maroon-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-maroon-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{editingCampus ? 'Edit Campus' : 'Add New Campus'}</h3>
                    <p className="text-sm text-gray-500">{editingCampus ? 'Update campus details' : 'Create a new campus location'}</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{formError}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campus Name <span className="text-red-500">*</span></label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Main Campus" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="e.g. 123 University Ave" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm" />
                </div>
              </div>
              <div className="p-5 flex gap-3 bg-gray-50/80 border-t border-gray-100">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm">Cancel</button>
                <button onClick={handleFormSubmit} className="flex-1 px-4 py-2.5 bg-maroon-800 text-white font-medium rounded-xl hover:bg-maroon-900 transition-colors shadow-sm flex justify-center items-center gap-2 text-sm">
                  <Save className="w-4 h-4" />
                  {editingCampus ? 'Update' : 'Create'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DELETE: First Confirmation ── */}
      <AnimatePresence>
        {isDeleteModalOpen && campusToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDeleteModalOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', duration: 0.3 }} className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-amber-50 px-5 pt-5 pb-3 border-b border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Delete Campus?</h3>
                    <p className="text-sm text-gray-600">This action requires double confirmation</p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-700">Are you sure you want to delete <span className="font-semibold">{campusToDelete.name}</span>? This may affect departments, appointments, and other related data.</p>
              </div>
              <div className="p-5 flex gap-3 bg-gray-50/80 border-t border-gray-100">
                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm">Cancel</button>
                <button onClick={handleDeleteFirstConfirm} className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-sm text-sm">Yes, Continue</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DELETE: Final Confirmation ── */}
      <AnimatePresence>
        {isFinalDeleteOpen && campusToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isDeleting && setIsFinalDeleteOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', duration: 0.3 }} className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-red-50 px-5 pt-5 pb-3 border-b border-red-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-900">Final Confirmation</h3>
                    <p className="text-sm text-red-700">This cannot be undone</p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-700">You are about to permanently delete <span className="font-bold text-red-700">{campusToDelete.name}</span>. Are you absolutely sure?</p>
              </div>
              <div className="p-5 flex gap-3 bg-gray-50/80 border-t border-gray-100">
                <button disabled={isDeleting} onClick={() => setIsFinalDeleteOpen(false)} className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm">Go Back</button>
                <button disabled={isDeleting} onClick={handleDeleteFinalConfirm} className="flex-1 px-4 py-2.5 bg-red-700 text-white font-medium rounded-xl hover:bg-red-800 disabled:opacity-50 transition-colors shadow-sm flex justify-center items-center text-sm">
                  {isDeleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Delete Permanently'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── EDIT: First Confirmation ── */}
      <AnimatePresence>
        {isEditConfirmOpen && editingCampus && pendingEditData && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsEditConfirmOpen(false); setPendingEditData(null); }} className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', duration: 0.3 }} className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-amber-50 px-5 pt-5 pb-3 border-b border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Update Campus?</h3>
                    <p className="text-sm text-gray-600">Please confirm your changes</p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 space-y-2 text-sm text-gray-700">
                <p>You are updating <span className="font-semibold">{editingCampus.name}</span>:</p>
                {editingCampus.name !== pendingEditData.name && <p>Name: <span className="line-through text-gray-400">{editingCampus.name}</span> → <span className="font-semibold">{pendingEditData.name}</span></p>}
                {(editingCampus.address || '') !== pendingEditData.address && <p>Address: <span className="line-through text-gray-400">{editingCampus.address || '(none)'}</span> → <span className="font-semibold">{pendingEditData.address || '(none)'}</span></p>}
              </div>
              <div className="p-5 flex gap-3 bg-gray-50/80 border-t border-gray-100">
                <button onClick={() => { setIsEditConfirmOpen(false); setPendingEditData(null); }} className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm">Cancel</button>
                <button onClick={handleEditFirstConfirm} className="flex-1 px-4 py-2.5 bg-maroon-800 text-white font-medium rounded-xl hover:bg-maroon-900 transition-colors shadow-sm text-sm">Yes, Continue</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── EDIT: Final Confirmation ── */}
      <AnimatePresence>
        {isFinalEditOpen && editingCampus && pendingEditData && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isSaving && setIsFinalEditOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', duration: 0.3 }} className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-maroon-50 px-5 pt-5 pb-3 border-b border-maroon-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-maroon-100 flex items-center justify-center">
                    <Check className="w-5 h-5 text-maroon-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Final Confirmation</h3>
                    <p className="text-sm text-gray-600">Save changes to this campus?</p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-700">Confirm saving changes to <span className="font-bold">{pendingEditData.name}</span>. This will update the campus across the entire system.</p>
              </div>
              <div className="p-5 flex gap-3 bg-gray-50/80 border-t border-gray-100">
                <button disabled={isSaving} onClick={() => setIsFinalEditOpen(false)} className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm">Go Back</button>
                <button disabled={isSaving} onClick={handleEditFinalConfirm} className="flex-1 px-4 py-2.5 bg-maroon-800 text-white font-medium rounded-xl hover:bg-maroon-900 disabled:opacity-50 transition-colors shadow-sm flex justify-center items-center text-sm">
                  {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ADD: First Confirmation ── */}
      <AnimatePresence>
        {isAddConfirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddConfirmOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', duration: 0.3 }} className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-amber-50 px-5 pt-5 pb-3 border-b border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Create Campus?</h3>
                    <p className="text-sm text-gray-600">Please confirm this action</p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-700">You are about to create a new campus: <span className="font-semibold">{formName.trim()}</span>{formAddress.trim() ? ` at ${formAddress.trim()}` : ''}.</p>
              </div>
              <div className="p-5 flex gap-3 bg-gray-50/80 border-t border-gray-100">
                <button onClick={() => setIsAddConfirmOpen(false)} className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm">Cancel</button>
                <button onClick={handleAddFirstConfirm} className="flex-1 px-4 py-2.5 bg-maroon-800 text-white font-medium rounded-xl hover:bg-maroon-900 transition-colors shadow-sm text-sm">Yes, Continue</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ADD: Final Confirmation ── */}
      <AnimatePresence>
        {isFinalAddOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isSaving && setIsFinalAddOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', duration: 0.3 }} className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-maroon-50 px-5 pt-5 pb-3 border-b border-maroon-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-maroon-100 flex items-center justify-center">
                    <Check className="w-5 h-5 text-maroon-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Final Confirmation</h3>
                    <p className="text-sm text-gray-600">Create this new campus?</p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-700">Confirm creating <span className="font-bold">{formName.trim()}</span>. This campus will be available system-wide immediately.</p>
              </div>
              <div className="p-5 flex gap-3 bg-gray-50/80 border-t border-gray-100">
                <button disabled={isSaving} onClick={() => setIsFinalAddOpen(false)} className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm">Go Back</button>
                <button disabled={isSaving} onClick={handleAddFinalConfirm} className="flex-1 px-4 py-2.5 bg-maroon-800 text-white font-medium rounded-xl hover:bg-maroon-900 disabled:opacity-50 transition-colors shadow-sm flex justify-center items-center text-sm">
                  {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Campus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
