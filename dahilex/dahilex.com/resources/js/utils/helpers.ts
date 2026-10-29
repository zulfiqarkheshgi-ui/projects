// Get base URL from page props or window
const getBaseUrl = (): string => {
    // Try window.APP_URL first
    if (typeof window !== 'undefined') {
        if ((window as any).APP_URL) {
            return (window as any).APP_URL;
        }
        // Try Inertia page props stored on window
        const pageProps = (window as any).__inertia?.page?.props ?? (window as any).page?.props;
        if (pageProps?.base_url) return pageProps.base_url;
    }
    return '';
};

export const isUserRegistrationEnabled = (): boolean => {
    if (typeof window !== 'undefined' && (window as any).page?.props) {
        const settings = (window as any).page.props.globalSettings || {};
        return settings.registrationEnabled;
    }
    return true;
};


// Currency formatting function
export const formatCurrency = (amount: string | number, useSuperAdminSettings = false) => {
    if (typeof window !== 'undefined' && window.appSettings?.formatCurrency) {
        const numericAmount =
            typeof amount === 'number' ? amount : parseFloat(amount);

        if (useSuperAdminSettings && window.appSettings?.formatCurrencyWithSuperAdminSettings) {
            return window.appSettings.formatCurrencyWithSuperAdminSettings(numericAmount, { showSymbol: true });
        }

        return window.appSettings.formatCurrency(numericAmount, { showSymbol: true });
    }
    return amount;
};

export const formatStatusText = (status: string) =>
  status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

// Get full image path helper - consistent with reference project
export const getImagePath = (path: string): string => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = getBaseUrl();
    // If path already contains public/screenshots, just prepend domain
    if (path.includes('public/screenshots')) {
        return path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
    }

    try {
        const dynamicPath = `${baseUrl}`;
        const globalSettings = (window as any).page.props.globalSettings;
        let imageUrlPrefix = globalSettings?.image_url || dynamicPath;

        if (!imageUrlPrefix.includes('storage/media')) {
            imageUrlPrefix = imageUrlPrefix.endsWith('/') ? imageUrlPrefix  : imageUrlPrefix + '/';
        }

        path = path.replace('storage/media','');

        // Handle slash concatenation
        const prefixEndsWithSlash = imageUrlPrefix.endsWith('/');
        const pathStartsWithSlash = path.startsWith('/');

        if (prefixEndsWithSlash && pathStartsWithSlash) {
            return imageUrlPrefix + path.substring(1);
        } else if (!prefixEndsWithSlash && !pathStartsWithSlash) {
            return imageUrlPrefix + '/' + path;
        } else {
            return imageUrlPrefix + path;
        }
    }
    catch {
        const fallbackPrefix = `${window.location.origin}`;
        return path.startsWith('/') ? fallbackPrefix + path.substring(1) : fallbackPrefix + path;
    }
};

// Date formatting function
export const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString();
};

// String capitalize function
export const capitalize = (str: string) => {
    if (!str) return '';

    return str
        .toLowerCase() // Convert everything to lowercase first
        .replace(/_/g, ' ') // Replace underscores with spaces
        .split(' ') // Split into words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter of each word
        .join(' '); // Join back with spaces
};


// Get status icon based on status value
export const getStatusIcon = (status: string | boolean | number) => {
    // Handle boolean values
    if (typeof status === 'boolean') {
        return status ? 'Unlock' : 'Lock';
    }

    // Handle string values
    if (typeof status === 'string') {
        const lowerStatus = status.toLowerCase();
        if (['active', 'enabled', 'open', 'published', 'approved', 'completed', 'paid'].includes(lowerStatus)) {
            return 'Unlock';
        }
        if (['inactive', 'disabled', 'closed', 'draft', 'pending', 'cancelled', 'unpaid'].includes(lowerStatus)) {
            return 'Lock';
        }
    }

    // Handle numeric values (1 = active, 0 = inactive)
    if (typeof status === 'number') {
        return status === 1 ? 'Unlock' : 'Lock';
    }

    // Default to Lock for unknown status
    return 'Lock';
};

// Get status label based on current status
export const getStatusLabel = (status: string | boolean | number, t: (key: string) => string) => {
    const icon = getStatusIcon(status);
    return icon === 'Unlock' ? t('Deactivate') : t('Activate');
};

// Get dynamic action config for status toggle
export const getStatusAction = (item: any, t: (key: string) => string, permission: string) => {
    const status = item.status;
    return {
        label: getStatusLabel(status, t),
        icon: getStatusIcon(status),
        action: 'toggle-status',
        className: 'text-green-500',
        requiredPermission: permission
    };
};

export const getIsDemo = () => {
    if (typeof window !== 'undefined') {
        const pageProps = (window as any).__inertia?.page?.props ?? (window as any).page?.props;
        const is_demo = pageProps?.is_demo ?? (window as any).is_demo;
        return is_demo === true || is_demo === 'true';
    }
    return false;
};

// Format currency using super admin settings for plans and referrals
export const formatCurrencyForPlansAndReferrals = (amount: string | number) => {
    if (typeof window !== 'undefined' && window.appSettings?.formatCurrencyWithSuperAdminSettings) {
        const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount);
        return window.appSettings.formatCurrencyWithSuperAdminSettings(numericAmount, { showSymbol: true });
    }
    return formatCurrency(amount);
};


// Format currency using company settings
export const formatCurrencyForCompany = (amount: string | number) => {
    if (typeof window !== 'undefined' && window.appSettings?.formatCurrency) {
        const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount);
        return window.appSettings.formatCurrency(numericAmount, { showSymbol: true });
    }
    return formatCurrency(amount);
};

export const hexToRgba = (hex, opacity) => {
  const r = parseInt(hex?.slice(1, 3), 16);
  const g = parseInt(hex?.slice(3, 5), 16);
  const b = parseInt(hex?.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
