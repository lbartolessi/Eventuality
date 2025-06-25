import { Eventuality } from '../../src/Eventuality.js';
import { createTypedEvent, RequestPayload, ErrorHandlingAction } from '../../src/interfaces.js';

// --- 1. Define Event Types ---

interface UserLoggedInPayload {
  userId: string;
  timestamp: number;
}
const userLoggedInEvent = createTypedEvent<UserLoggedInPayload>('USER_LOGGED_IN');

interface OrderPlacedPayload {
  orderId: string;
  amount: number;
  userId: string;
}
const orderPlacedEvent = createTypedEvent<OrderPlacedPayload>('ORDER_PLACED');

interface GetProductDetailsRequest extends RequestPayload<ProductDetailsResponse> {
  productId: string;
}
interface ProductDetailsResponse {
  id: string;
  name: string;
  price: number;
  description: string;
}
const getProductDetailsRequest = createTypedEvent<GetProductDetailsRequest>('GET_PRODUCT_DETAILS');

const criticalSystemErrorEvent = createTypedEvent<{ message: string; code: number }>('CRITICAL_SYSTEM_ERROR');

// --- 2. Initialize Eventuality ---

const globalErrorHandler = (error: Error, event: any, handler: any, payload: any): ErrorHandlingAction | undefined => {
  console.error(`🚨 Global Error Handler: ${error.message}`);
  console.error(`   Event: ${event.eventType}, Handler: ${handler?.className}, Payload:`, payload);
  // For demo purposes, we'll just log and continue, but could return 'stop_event' or 'disable_handler'
  return 'continue';
};

const eventuality = Eventuality.createInstance({
  debugMode: true, // Enable detailed logging
  handleError: globalErrorHandler,
});

console.log('--- Eventuality Demo Started ---');

// --- 3. Define Handlers ---

class UserActivityService {
  constructor(private name: string) {}

  onUserLogin(payload: UserLoggedInPayload) {
    console.log(`[${this.name}] User ${payload.userId} logged in at ${new Date(payload.timestamp).toLocaleTimeString()}`);
  }

  onOrderPlaced(payload: OrderPlacedPayload) {
    console.log(`[${this.name}] Order ${payload.orderId} placed by user ${payload.userId} for $${payload.amount}`);
  }

  onCriticalError(payload: { message: string; code: number }) {
    console.log(`[${this.name}] Received critical error: ${payload.message} (Code: ${payload.code})`);
  }
}

class ProductService {
  getProductDetails(request: GetProductDetailsRequest) {
    console.log(`[ProductService] Received request for product ${request.productId}`);
    const productData: ProductDetailsResponse = {
      id: request.productId,
      name: `Product ${request.productId}`,
      price: 99.99,
      description: `Details for product ${request.productId}`,
    };
    // Publish the reply to the temporary channel
    eventuality.publish(request.replyTo!, productData);
  }
}

// --- 4. Create Handler Instances ---

const userActivityServiceUI = new UserActivityService('UserActivityService (UI)');
const userActivityServiceBackend = new UserActivityService('UserActivityService (Backend)');
const productService = new ProductService();

// --- 5. Subscribe Handlers ---

// Subscribe to user login events on different clusters
eventuality.subscribe(userLoggedInEvent, Eventuality.createEventHandler(userActivityServiceUI.onUserLogin, userActivityServiceUI), 'ui-cluster');
eventuality.subscribe(userLoggedInEvent, Eventuality.createEventHandler(userActivityServiceBackend.onUserLogin, userActivityServiceBackend), 'backend-cluster');

// Subscribe to order placed events globally
eventuality.subscribe(orderPlacedEvent, Eventuality.createEventHandler(userActivityServiceBackend.onOrderPlaced, userActivityServiceBackend));

// Product service subscribes to product detail requests
eventuality.subscribe(getProductDetailsRequest, Eventuality.createEventHandler(productService.getProductDetails, productService), 'product-cluster');

// --- 6. Demonstrate Event Persistence ---

console.log('\n--- Demonstrating Event Persistence ---');
const newFeatureEvent = createTypedEvent<{ data: string }>('NEW_FEATURE_ANNOUNCEMENT');

// Publish an event before any handler subscribes to it
eventuality.publish(newFeatureEvent, { data: 'Exciting new feature is coming!' });
console.log('Published NEW_FEATURE_ANNOUNCEMENT. No subscribers yet, so it should be persisted.');

class NewFeatureHandler {
  onNewFeature(payload: { data: string }) {
    console.log(`[NewFeatureHandler] Received persisted announcement: ${payload.data}`);
  }
}
const newFeatureHandlerInstance = new NewFeatureHandler();
eventuality.subscribe(newFeatureEvent, Eventuality.createEventHandler(newFeatureHandlerInstance.onNewFeature, newFeatureHandlerInstance));
console.log('Subscribed NewFeatureHandler. The persisted event should now be delivered.');

// --- 7. Publish Events ---

console.log('\n--- Publishing Events ---');
eventuality.publish(userLoggedInEvent, { userId: 'user-A', timestamp: Date.now() }, new Set(['ui-cluster']));
eventuality.publish(userLoggedInEvent, { userId: 'user-B', timestamp: Date.now() }, new Set(['backend-cluster']));
eventuality.publish(orderPlacedEvent, { orderId: 'ORD-001', amount: 150.75, userId: 'user-A' });

// --- 8. Demonstrate Request/Reply ---

console.log('\n--- Demonstrating Request/Reply ---');
async function requestProductDetails(productId: string) {
  try {
    console.log(`Requesting details for product ${productId}...`);
    const productDetails = await eventuality.request(
      getProductDetailsRequest,
      { productId: productId, clusterTo: 'product-cluster' },
      new Set(['product-cluster']),
      5000 // 5 second timeout
    );
    const details = productDetails as ProductDetailsResponse;
    console.log(`Received product details for ${details.name}: $${details.price}`);
  } catch (error: any) {
    console.error(`Error requesting product details: ${error.message}`);
  }
}

requestProductDetails('PROD-123');
requestProductDetails('PROD-456'); // This one might time out if no handler is on 'product-cluster'

// --- 9. Demonstrate Error Handling ---

console.log('\n--- Demonstrating Error Handling ---');
const faultyHandler = Eventuality.createEventHandler(() => {
  throw new Error('Simulated handler error!');
}, {});
eventuality.subscribe(criticalSystemErrorEvent, faultyHandler);
eventuality.publish(criticalSystemErrorEvent, { message: 'Database connection lost', code: 500 });

console.log('\n--- Eventuality Demo Finished ---');