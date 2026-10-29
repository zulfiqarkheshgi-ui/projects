import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';
import React from 'react';
import { useFavicon } from '@/hooks/use-favicon';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { useLayout } from '@/contexts/LayoutContext';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => {
    useFavicon();
    useBrandTheme();
    
    const { effectivePosition } = useLayout();

    // Ensure LTR direction for app layout
    React.useEffect(() => {
        document.documentElement.dir = 'ltr';
        document.documentElement.setAttribute('dir', 'ltr');
        document.body.dir = 'ltr';
    }, []);

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
            {children}
        </AppLayoutTemplate>
    );
};
