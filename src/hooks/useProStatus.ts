/**
 * Hook to check if user has Pro subscription
 * 
 * This is now a read-only consumer that reads from ProStatusContext.
 * All subscription checking logic has been moved to ProStatusProvider.
 * 
 * @deprecated This file is kept for backward compatibility.
 * Components should import from @/contexts/ProStatusContext instead.
 */
export { useProStatus } from '@/contexts/ProStatusContext';

