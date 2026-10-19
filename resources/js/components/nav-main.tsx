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

const EXACT_MATCH_URLS = ['/dashboard/admin', '/dashboard/operator', '/dashboard/operator-tim'];

function getPath(url: string): string {
    return url.split('?')[0].split('#')[0].replace(/\/+$/, '');
}

function isActivePath(currentUrl: string, itemUrl: string, options?: { exact?: boolean }): boolean {
    const currentPath = getPath(currentUrl);
    const itemPath = getPath(itemUrl);

    if (options?.exact || EXACT_MATCH_URLS.includes(itemPath)) {
        return currentPath === itemPath;
    }

    if (itemPath === '/settings/application' && currentPath.startsWith('/settings')) {
        return true;
    }

    return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
}

function isItemActive(item: NavItem, currentUrl: string): boolean {
    if (isActivePath(currentUrl, item.url)) {
        return true;
    }

    return item.items?.some((subItem) => isActivePath(currentUrl, subItem.url)) ?? false;
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
                                                <SidebarMenuSubButton asChild isActive={isActivePath(page.url, subItem.url)}>
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
                            <SidebarMenuButton asChild isActive={isActivePath(page.url, item.url)}>
                                {item.external ? (
                                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </a>
                                ) : (
                                    <Link href={item.url} prefetch>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </Link>
                                )}
                            </SidebarMenuButton>
                            {item.badge != null && item.badge > 0 && (
                                <SidebarMenuBadge className="bg-primary text-white peer-hover/menu-button:text-white peer-data-[active=true]/menu-button:text-white dark:bg-blue-500 dark:text-white">
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
