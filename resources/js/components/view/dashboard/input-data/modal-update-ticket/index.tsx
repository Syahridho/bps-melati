import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import { FormEvent } from 'react';

interface EditFormData {
    data: {
        title: string;
        reporter_name: string;
        reporter_email: string;
        reporter_wa: string;
        content: string;
    };
    setData: (field: string, value: string) => void;
    processing: boolean;
}

interface InputDataUpdateTicketDialogProps {
    isEditOpen: boolean;
    setIsEditOpen: (open: boolean) => void;
    editForm: EditFormData;
    handleEditSubmit: (e: FormEvent) => void;
}

export default function InputDataUpdateTicketDialog({ setIsEditOpen, editForm, isEditOpen, handleEditSubmit }: InputDataUpdateTicketDialogProps) {
    return (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Tiket Input Data</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                    <div>
                        <label className="text-xs font-medium">Judul</label>
                        <input
                            type="text"
                            value={editForm.data.title}
                            onChange={(e) => editForm.setData('title', e.target.value)}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium">Nama Pelapor</label>
                        <input
                            type="text"
                            value={editForm.data.reporter_name}
                            onChange={(e) => editForm.setData('reporter_name', e.target.value)}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium">Email</label>
                            <input
                                type="email"
                                value={editForm.data.reporter_email}
                                onChange={(e) => editForm.setData('reporter_email', e.target.value)}
                                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium">WhatsApp</label>
                            <input
                                type="text"
                                value={editForm.data.reporter_wa}
                                onChange={(e) => editForm.setData('reporter_wa', e.target.value)}
                                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium">Isi Laporan</label>
                        <Textarea
                            value={editForm.data.content}
                            onChange={(e) => editForm.setData('content', e.target.value)}
                            className="mt-1 min-h-[100px] text-sm"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={editForm.processing}>
                            Simpan Perubahan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
