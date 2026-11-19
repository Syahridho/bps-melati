"use client"

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Filter, Check, X } from 'lucide-react'
import * as React from 'react'

interface RoleFilterProps {
    roles: string[]
    availableRoles: string[]
    onRolesChange: (roles: string[]) => void
    className?: string
}

const ROLE_DEFINITIONS: Array<{ value: string; label: string }> = [
    { value: 'admin', label: 'Admin' },
    { value: 'operator', label: 'Operator' },
    { value: 'operator_tim', label: 'Operator Tim' },
]

function roleLabel(value: string): string {
    const def = ROLE_DEFINITIONS.find((d) => d.value === value)
    return def ? def.label : value
}

function labelForRoles(selected: string[], allRoles: string[]): string {
    const isAll =
        allRoles.length > 0 &&
        selected.length === allRoles.length &&
        allRoles.every((r) => selected.includes(r))
    const specific = isAll ? [] : selected.filter((r) => allRoles.includes(r))

    if (specific.length === 0) return 'Semua role'
    if (specific.length === 1) return roleLabel(specific[0])

    const combined = specific.map(roleLabel).join(', ')
    return combined.length > 20 ? `${specific.length} role` : combined
}

export function RoleFilter({
    roles,
    availableRoles,
    onRolesChange,
    className,
}: RoleFilterProps) {
    const [open, setOpen] = React.useState(false)
    const [draftRoles, setDraftRoles] = React.useState<string[]>(roles)

    React.useEffect(() => {
        setDraftRoles(roles)
    }, [roles])

    const specificRoles = availableRoles.filter((r) =>
        ROLE_DEFINITIONS.some((d) => d.value === r),
    )

    const isAllSelected =
        specificRoles.length > 0 &&
        draftRoles.length === specificRoles.length &&
        specificRoles.every((r) => draftRoles.includes(r))

    const activeRoles = isAllSelected ? [] : draftRoles
    const hasActiveFilter = activeRoles.length > 0

    const isRoleSelected = (value: string) => draftRoles.includes(value)

    const toggleRole = (value: string) => {
        if (isRoleSelected(value)) {
            setDraftRoles(draftRoles.filter((r) => r !== value))
        } else {
            setDraftRoles([...draftRoles, value])
        }
    }

    const handleApply = () => {
        onRolesChange(activeRoles)
        setOpen(false)
    }

    const label = labelForRoles(draftRoles, specificRoles)

    return (
        <div className={cn('grid gap-2', className)}>
            <Popover
                open={open}
                onOpenChange={(isOpen) => {
                    setOpen(isOpen)
                    if (isOpen) {
                        setDraftRoles(roles)
                    }
                }}
            >
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            'w-full justify-start text-left font-normal sm:w-auto',
                            hasActiveFilter ? '' : 'text-muted-foreground',
                        )}
                        aria-label="Filter role pengguna"
                    >
                        <Filter className="mr-2 size-4" />
                        {label}
                        {hasActiveFilter && <X className="ml-1 size-3.5 opacity-60" />}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <div className="flex flex-col border-b p-2">
                        <span className="text-muted-foreground px-2 py-1 text-xs font-semibold">
                            Role
                        </span>
                        {specificRoles.map((value) => {
                            const checked = isRoleSelected(value)
                            return (
                                <div
                                    key={value}
                                    className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent/50 cursor-pointer"
                                    role="none"
                                    onClick={() => toggleRole(value)}
                                >
                                    <Checkbox
                                        checked={checked}
                                        onCheckedChange={() => toggleRole(value)}
                                        className="shrink-0"
                                        aria-label={roleLabel(value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="flex-1 truncate">{roleLabel(value)}</span>
                                    {checked && <Check className="ml-2 size-3.5" />}
                                </div>
                            )
                        })}
                    </div>

                    <div className="border-t p-2">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleApply}
                            className="w-full text-xs"
                        >
                            Terapkan
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
