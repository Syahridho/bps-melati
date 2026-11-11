"use client"

import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { type ChannelGroup, type ChannelChild } from '@/types/input-data'
import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface FlatOption {
    value: string | number
    label: string
}

interface HierarchicalSearchableSelectProps {
    value: string
    channels?: ChannelGroup[]
    flatOptions?: FlatOption[]
    onChange: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyText?: string
    id?: string
    disabled?: boolean
    error?: boolean
    className?: string
}

interface RenderItem {
    kind: 'group' | 'option'
    groupId?: number
    groupName?: string
    child?: ChannelChild
    flatOption?: FlatOption
}

/**
 * Normalisasi teks untuk pencarian: lowercase, rapikan spasi, hilangkan spasi
 * tepi. Slug juga dipertimbangkan sebagai cocok.
 */
function normalize(text: string): string {
    return text
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
}

function matches(text: string | undefined, query: string): boolean {
    if (!text) return false
    return normalize(text).includes(query)
}

/**
 * Bentuk daftar grup yang lolos filter query (mode hierarkis).
 * - Query kosong: semua grup + semua anak.
 * - Cocok nama induk (atau slug): tampilkan induk + semua anaknya.
 * - Cocok nama anak (atau slug): tampilkan induk (header) + anak yang cocok saja.
 * - Grup tanpa hasil disembunyikan.
 */
function buildFilteredGroups(channels: ChannelGroup[], query: string) {
    const q = normalize(query)

    return channels
        .map((group) => {
            const parentMatch = q ? matches(group.name, q) || matches(group.slug, q) : false

            let matchingChildren: ChannelChild[]
            if (q && parentMatch) {
                // Cocok nama induk → tampilkan semua anaknya
                matchingChildren = group.children
            } else if (q) {
                // Cocok nama anak → tampilkan hanya anak yang cocok
                matchingChildren = group.children.filter(
                    (child) => matches(child.name, q) || matches(child.slug, q)
                )
            } else {
                matchingChildren = group.children
            }

            return {
                group,
                parentMatch,
                matchingChildren,
                hasMatch: !q || parentMatch || matchingChildren.length > 0,
            }
        })
        .filter((entry) => entry.hasMatch)
}

/**
 * Susun flat daftar item yang dirender (header grup + opsi anak), untuk
 * navigasi keyboard dan scroll aktif yang terpadu.
 */
function buildRenderItems(
    mode: 'hierarchical' | 'flat',
    filteredGroups: Array<{ group: ChannelGroup; matchingChildren: ChannelChild[]; parentMatch: boolean }>,
    filteredOptions: FlatOption[]
): RenderItem[] {
    const items: RenderItem[] = []

    if (mode === 'flat') {
        filteredOptions.forEach((opt) => {
            items.push({ kind: 'option', flatOption: opt })
        })
        return items
    }

    filteredGroups.forEach((entry) => {
        const { group, matchingChildren } = entry

        // Grup tanpa anak dirender sebagai opsi yang dapat dipilih (bukan header grup)
        if (matchingChildren.length === 0) {
            items.push({
                kind: 'option',
                groupId: group.id,
                groupName: group.name,
                child: { id: group.id, name: group.name, slug: group.slug },
            })
        } else {
            items.push({ kind: 'group', groupId: group.id, groupName: group.name })
            matchingChildren.forEach((child) => {
                items.push({ kind: 'option', groupId: group.id, groupName: group.name, child })
            })
        }
    })

    return items
}

/**
 * Tandai bagian teks yang cocok dengan query dengan <mark>, sisanya teks biasa.
 * Ringan dan case-insensitive.
 */
function highlightMatch(text: string, query: string): JSX.Element | string {
    const q = normalize(query)
    if (!q || !text) return text

    const lower = text.toLowerCase()
    const idx = lower.indexOf(q)
    if (idx === -1) return text

    const before = text.slice(0, idx)
    const match = text.slice(idx, idx + q.length)
    const after = text.slice(idx + q.length)

    return (
        <>
            {before}
            <mark className="bg-accent text-accent-foreground">{match}</mark>
            {after}
        </>
    )
}

export function HierarchicalSearchableSelect({
    value,
    channels,
    flatOptions,
    onChange,
    placeholder = 'Pilih sumber kanal',
    searchPlaceholder = 'Cari sumber kanal...',
    emptyText = 'Sumber kanal tidak ditemukan.',
    id,
    disabled = false,
    error = false,
    className,
}: HierarchicalSearchableSelectProps) {
    const rootId = id || 'channel-select'
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const triggerRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const mode = flatOptions ? 'flat' : 'hierarchical'

    // Nama opsi yang sedang dipilih (untuk ditampilkan di trigger).
    const selectedItem = useMemo(() => {
        if (mode === 'flat') {
            return flatOptions?.find((opt) => String(opt.value) === value)
        }

        for (const group of channels ?? []) {
            const child = group.children.find((c) => String(c.id) === value)
            if (child) return child
            // Grup tanpa anak: nilai yang disimpan bisa berupa id grup itu sendiri
            if (group.children.length === 0 && String(group.id) === value) {
                return { id: group.id, name: group.name, slug: group.slug }
            }
        }
        return undefined
    }, [mode, flatOptions, channels, value])

    // Label yang ditampilkan di trigger, dengan tipe yang aman untuk kedua mode.
    const selectedLabel = useMemo(() => {
        if (!selectedItem) return undefined
        if (mode === 'flat') return (selectedItem as FlatOption).label
        return (selectedItem as ChannelChild).name
    }, [mode, selectedItem])

    const filteredGroups = useMemo(
        () => (mode === 'hierarchical' ? buildFilteredGroups(channels ?? [], searchQuery) : []),
        [channels, searchQuery, mode]
    )
    const filteredOptions = useMemo(
        () =>
            mode === 'flat'
                ? flatOptions!.filter((opt) => matches(opt.label, searchQuery))
                : [],
        [flatOptions, searchQuery, mode]
    )
    const renderItems = useMemo(
        () => buildRenderItems(mode, filteredGroups, filteredOptions),
        [mode, filteredGroups, filteredOptions]
    )

    // Indeks opsi yang dapat dipilih (hanya opsi, header grup dilewati).
    const selectableIndices = useMemo(
        () =>
            renderItems
                .map((item, i) => (item.kind === 'option' ? i : -1))
                .filter((i) => i !== -1),
        [renderItems]
    )

    const [activeIndex, setActiveIndex] = useState<number | null>(null)

    const selectedRenderIndex = useMemo(() => {
        return renderItems.findIndex((item) => {
            if (item.kind !== 'option') return false
            if (mode === 'flat') {
                return item.flatOption && String(item.flatOption.value) === value
            }
            return item.child && String(item.child.id) === value
        })
    }, [renderItems, mode, value])

    const firstSelectableIndex = useMemo(() => selectableIndices[0] ?? null, [selectableIndices])

    // Saat dibuka: item terpilih jadi aktif; kalau belum ada pilihan, item pertama.
    useEffect(() => {
        if (!isOpen) return
        const target = selectedRenderIndex !== -1 ? selectedRenderIndex : firstSelectableIndex
        setActiveIndex(target)
    }, [isOpen, selectedRenderIndex, firstSelectableIndex])

    // Reset kata kunci & aktif saat dropdown ditutup.
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('')
            setActiveIndex(null)
        }
    }, [isOpen])

    // Auto-focus input pencarian saat dibuka.
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus()
        }
    }, [isOpen])

    // Scroll item aktif ke area terlihat saat berubah.
    useEffect(() => {
        if (activeIndex == null) return
        const item = renderItems[activeIndex]
        if (!item || item.kind !== 'option') return

        let el: HTMLElement | null = null
        if (mode === 'flat' && item.flatOption) {
            el = document.getElementById(`${rootId}-option-flat-${String(item.flatOption.value)}`)
        } else if (mode === 'hierarchical' && item.child) {
            el = document.getElementById(`${rootId}-option-${item.groupId}-${String(item.child.id)}`)
        }
        if (!el) return
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, [activeIndex, renderItems, rootId, mode])

    const handleSelect = useCallback(
        (val: string) => {
            onChange(val)
            setSearchQuery('')
            setIsOpen(false)
            setActiveIndex(null)
        },
        [onChange]
    )

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value)
    }

    // Reset aktif ke hasil pertama saat keyword berubah (dropdown terbuka).
    useEffect(() => {
        if (!isOpen) return
        setActiveIndex(firstSelectableIndex)
    }, [searchQuery, isOpen, firstSelectableIndex])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            // Dropdown tertutup: tombol pada trigger membuka dropdown.
            if (!isOpen) {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                    e.preventDefault()
                    setIsOpen(true)
                }
                return
            }

            if (e.key === 'Escape') {
                e.preventDefault()
                setIsOpen(false)
                setSearchQuery('')
                setActiveIndex(null)
                return
            }

            if (e.key === 'Tab') {
                return
            }

            if (e.key === 'Home' || e.key === 'End') {
                e.preventDefault()
                const target =
                    e.key === 'Home' ? firstSelectableIndex : selectableIndices[selectableIndices.length - 1]
                setActiveIndex(target ?? null)
                return
            }

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault()
                if (selectableIndices.length === 0) return

                const currentPos = activeIndex == null ? -1 : selectableIndices.indexOf(activeIndex)
                const step = e.key === 'ArrowDown' ? 1 : -1
                let nextPos = currentPos + step
                if (nextPos < 0) nextPos = selectableIndices.length - 1
                if (nextPos >= selectableIndices.length) nextPos = 0

                setActiveIndex(selectableIndices[nextPos])
                return
            }

            if (e.key === 'Enter') {
                e.preventDefault()
                if (activeIndex != null) {
                    const item = renderItems[activeIndex]
                    if (!item || item.kind !== 'option') return

                    if (mode === 'flat' && item.flatOption) {
                        handleSelect(String(item.flatOption.value))
                    } else if (mode === 'hierarchical' && item.child) {
                        handleSelect(String(item.child.id))
                    }
                }
                return
            }
        },
        [
            isOpen,
            activeIndex,
            selectableIndices,
            firstSelectableIndex,
            renderItems,
            mode,
            handleSelect,
        ]
    )

    const activeElementId = useMemo(() => {
        if (activeIndex == null) return ''
        const item = renderItems[activeIndex]
        if (!item || item.kind !== 'option') return ''

        if (mode === 'flat' && item.flatOption) {
            return `${rootId}-option-flat-${String(item.flatOption.value)}`
        }
        if (mode === 'hierarchical' && item.child) {
            return `${rootId}-option-${item.groupId}-${String(item.child.id)}`
        }
        return ''
    }, [activeIndex, renderItems, rootId, mode])

    const hasResults = renderItems.some((i) => i.kind === 'option')

    return (
        <div ref={triggerRef} className={cn('relative w-full', className)}>
            <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen} modal={false}>
                <PopoverPrimitive.Trigger asChild>
                    <button
                        type="button"
                        id={`${rootId}-trigger`}
                        role="combobox"
                        aria-expanded={isOpen}
                        aria-controls={`${rootId}-listbox`}
                        aria-activedescendant={activeElementId || undefined}
                        aria-labelledby={`${rootId}-label`}
                        disabled={disabled}
                        onClick={() => setIsOpen((o) => !o)}
                        onKeyDown={handleKeyDown}
                        className={cn(
                            'flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                            disabled ? 'text-muted-foreground' : '',
                            !selectedItem ? 'text-muted-foreground' : '',
                            error ? 'border-destructive' : 'border-input'
                        )}
                    >
                        <span className="truncate select-none text-left">
                            {selectedLabel ?? placeholder}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </button>
                </PopoverPrimitive.Trigger>

                <PopoverPrimitive.Content
                    sideOffset={4}
                    className={cn(
                        'z-50 w-[var(--radix-popover-trigger-width)] min-w-[8rem] rounded-md border bg-popover text-popover-foreground shadow-md outline-none overflow-hidden',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
                        // Tinggi maksimum menyesuaikan ruang layar tersedia (Radix Popover isi CSS var ini).
                        'max-h-[var(--radix-popover-content-available-height)]'
                    )}
                >
                    <ScrollArea className="w-full min-w-[8rem] bg-popover max-h-[min(var(--radix-popover-content-available-height),400px)] overflow-y-auto overscroll-contain">
                        {/* Input pencarian: menempel di atas saat daftar di-scroll. */}
                        <div className="flex items-center border-b px-3 py-2 sticky top-0 z-10 bg-popover">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                placeholder={searchPlaceholder}
                                disabled={disabled}
                                autoComplete="off"
                                spellCheck={false}
                                onKeyDown={handleKeyDown}
                                className="flex h-7 w-full rounded-md bg-transparent text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        <div
                            className="max-h-full overflow-y-auto p-1 outline-none"
                            role="listbox"
                            id={`${rootId}-listbox`}
                            aria-labelledby={`${rootId}-label`}
                        >
                            {!hasResults ? (
                                <div className="py-4 text-center text-sm text-muted-foreground">
                                    {emptyText}
                                </div>
                            ) : (
                                renderItems.map((item, order) => {
                                    if (item.kind === 'group') {
                                        const isFirstGroup = order === 0
                                        return (
                                            <div key={`group-${item.groupId}`} className="space-y-1">
                                                {!isFirstGroup && <Separator className="-mx-1 my-1" />}
                                                <div
                                                    role="group"
                                                    aria-label={item.groupName}
                                                    className="px-2 py-1.5 text-sm font-semibold select-none"
                                                >
                                                    {item.groupName}
                                                </div>
                                            </div>
                                        )
                                    }

                                    const isSelected =
                                        mode === 'flat'
                                            ? item.flatOption && String(item.flatOption.value) === value
                                            : item.child && String(item.child.id) === value

                                    const optionLabel =
                                        mode === 'flat' ? item.flatOption!.label : item.child!.name
                                    const optionValue =
                                        mode === 'flat'
                                            ? String(item.flatOption!.value)
                                            : String(item.child!.id)

                                    return (
                                        <button
                                            key={`option-${order}`}
                                            id={`${rootId}-option-${order}`}
                                            type="button"
                                            role="option"
                                            aria-selected={isSelected}
                                            aria-label={optionLabel}
                                            disabled={disabled}
                                            onClick={() => handleSelect(optionValue)}
                                            onMouseMove={() => setActiveIndex(order)}
                                            className={cn(
                                                'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden text-left',
                                                'data-[focus-visible]:bg-accent data-[focus-visible]:text-accent-foreground',
                                                activeIndex === order ? 'bg-accent text-accent-foreground' : '',
                                                isSelected ? 'bg-accent/50 font-medium' : 'hover:bg-accent/50',
                                                disabled ? 'opacity-50 pointer-events-none' : ''
                                            )}
                                        >
                                            <span className="flex-1 truncate pl-2">
                                                {highlightMatch(optionLabel, searchQuery)}
                                            </span>
                                            {isSelected && (
                                                <Check className="ml-2 h-4 w-4 text-primary shrink-0" />
                                            )}
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </ScrollArea>
                </PopoverPrimitive.Content>
            </PopoverPrimitive.Root>
        </div>
    )
}
