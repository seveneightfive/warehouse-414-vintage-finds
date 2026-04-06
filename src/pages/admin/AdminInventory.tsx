/**
 * AdminInventory — renders the same AdminProducts component but lands on
 * the "inventory" tab by default. The URL is /admin/inventory but the
 * component internally uses the same status-tab logic.
 *
 * The simplest approach: just redirect to /admin/products?status=inventory
 * so AdminProducts handles everything from a single route.
 */
import { Navigate } from 'react-router-dom';

const AdminInventory = () => <Navigate to="/admin/products?status=inventory" replace />;

export default AdminInventory;
