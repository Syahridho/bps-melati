import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';

// Halaman utama dashboard harus cocok persis, kalau tidak akan menyala di semua halaman turunannya
const EXACT_MATCH_URLS = ['/dashboard/admin', '/dashboard/operator'];

function getPath(url: string): string {
    return url.split('?')[0].split('#')[0];
}

function isUrlActive(itemUrl: string, currentUrl: string): boolean {
    const currentPath = getPath(currentUrl);
    const itemPath = getPath(itemUrl);

    if (EXACT_MATCH_URLS.includes(itemPath)) {
        return currentPath === itemPath;
    }

    return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
}

function isItemActive(item: NavItem, currentUrl: string): boolean {
    if (isUrlActive(item.url, currentUrl)) {
        return true;
    }

    return item.items?.some((subItem) => isUrlActive(subItem.url, currentUrl)) ?? false;
}

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) =>
                    item.items?.length ? (
                        <Collapsible key={item.title} asChild defaultOpen={isItemActive(item, page.url)} className="group/collapsible">
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton tooltip={item.title}>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {item.items.map((subItem) => (
                                            <SidebarMenuSubItem key={subItem.title}>
                                                <SidebarMenuSubButton asChild isActive={isUrlActive(subItem.url, page.url)}>
                                                    <Link href={subItem.url} prefetch>
                                                        <span>{subItem.title}</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    ) : (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={isUrlActive(item.url, page.url)}>
                                <Link href={item.url} prefetch>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                            {item.badge != null && item.badge > 0 && (
                                <SidebarMenuBadge className="bg-black !text-white">
                                    {item.badge > 99 ? '99+' : item.badge}
                                </SidebarMenuBadge>
                            )}
                        </SidebarMenuItem>
                    ),
                )}
            </SidebarMenu>
        </SidebarGroup>
    );
}