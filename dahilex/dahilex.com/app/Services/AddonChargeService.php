<?php

namespace App\Services;

use net\authorize\api\contract\v1 as AnetAPI;
use net\authorize\api\controller as AnetController;

/**
 * Generic "charge this card for this amount" wrapper, extracted from
 * AuthorizeNetPaymentController::createAuthorizeNetTransaction() so it can
 * be reused for add-on charges (not just initial plan subscription).
 *
 * Deliberately does NOT know about plans, subscriptions, or add-ons — it
 * only knows how to run one authCaptureTransaction and interpret the
 * response. Same gateway settings source (getPaymentGatewaySettings())
 * and same response-handling logic as the existing controller, so
 * behavior stays consistent across both charge paths.
 */
class AddonChargeService
{
    /**
     * @param array $cardData ['card_number','expiry_month','expiry_year','cvv','cardholder_name']
     * @param float $amount
     * @param string $description shown on the AuthorizeNet transaction/order
     * @param array $userFields optional extra key => value pairs tagged onto the transaction (e.g. ['subscription_id' => 12, 'feature' => 'cases'])
     * @return array ['success' => bool, 'transaction_id' => ?string, 'error' => ?string]
     */
    public function charge(array $cardData, float $amount, string $description, array $userFields = []): array
    {
        $settings = getPaymentGatewaySettings();

        if (! isset($settings['payment_settings']['authorizenet_merchant_id'])
            || ! isset($settings['payment_settings']['authorizenet_transaction_key'])
        ) {
            return ['success' => false, 'error' => __('AuthorizeNet not properly configured'), 'transaction_id' => null];
        }

        if ($amount < 0.50) {
            return ['success' => false, 'error' => __('Minimum payment amount is $0.50'), 'transaction_id' => null];
        }

        try {
            $merchantAuthentication = new AnetAPI\MerchantAuthenticationType();
            $merchantAuthentication->setName($settings['payment_settings']['authorizenet_merchant_id']);
            $merchantAuthentication->setTransactionKey($settings['payment_settings']['authorizenet_transaction_key']);

            $creditCard = new AnetAPI\CreditCardType();
            $creditCard->setCardNumber(preg_replace('/\s+/', '', $cardData['card_number']));

            $expiryYear = 2000 + intval($cardData['expiry_year']);
            $expiryMonth = str_pad($cardData['expiry_month'], 2, '0', STR_PAD_LEFT);
            $creditCard->setExpirationDate($expiryYear . '-' . $expiryMonth);
            $creditCard->setCardCode($cardData['cvv']);

            $paymentOne = new AnetAPI\PaymentType();
            $paymentOne->setCreditCard($creditCard);

            $order = new AnetAPI\OrderType();
            $order->setInvoiceNumber('ADDON-' . time());
            $order->setDescription($description);

            $user = auth()->user();
            $customer = new AnetAPI\CustomerDataType();
            $customer->setType('individual');
            $customer->setId(auth()->id() ?? 'guest');
            $customer->setEmail($user ? $user->email : 'noemail@example.com');

            $billTo = new AnetAPI\CustomerAddressType();
            $nameParts = explode(' ', $cardData['cardholder_name']);
            $billTo->setFirstName($nameParts[0]);
            $billTo->setLastName(implode(' ', array_slice($nameParts, 1)) ?: 'Customer');
            $billTo->setCompany($user ? $user->name : 'N/A');
            $billTo->setAddress('N/A');
            $billTo->setCity('N/A');
            $billTo->setState('N/A');
            $billTo->setZip('00000');
            $billTo->setCountry('US');

            $transactionRequestType = new AnetAPI\TransactionRequestType();
            $transactionRequestType->setTransactionType('authCaptureTransaction');
            $transactionRequestType->setAmount(number_format($amount, 2, '.', ''));
            $transactionRequestType->setPayment($paymentOne);
            $transactionRequestType->setOrder($order);
            $transactionRequestType->setBillTo($billTo);
            $transactionRequestType->setCustomer($customer);

            $userFields['user_id'] = auth()->id() ?? 'guest';
            $fields = [];
            foreach ($userFields as $name => $value) {
                $field = new AnetAPI\UserFieldType();
                $field->setName((string) $name);
                $field->setValue((string) $value);
                $fields[] = $field;
            }
            $transactionRequestType->setUserFields($fields);

            $request = new AnetAPI\CreateTransactionRequest();
            $request->setMerchantAuthentication($merchantAuthentication);
            $request->setTransactionRequest($transactionRequestType);

            $controller = new AnetController\CreateTransactionController($request);

            $environment = ($settings['payment_settings']['authorizenet_mode'] === 'sandbox')
                ? \net\authorize\api\constants\ANetEnvironment::SANDBOX
                : \net\authorize\api\constants\ANetEnvironment::PRODUCTION;

            $response = $controller->executeWithApiResponse($environment);

            return $this->handleResponse($response);
        } catch (\Exception $e) {
            \Log::error('AddonChargeService transaction error: ' . $e->getMessage());

            return ['success' => false, 'error' => __('Payment processing failed. Please try again or contact support.'), 'transaction_id' => null];
        }
    }

    private function handleResponse($response): array
    {
        if ($response === null) {
            return ['success' => false, 'error' => __('No response received from payment gateway'), 'transaction_id' => null];
        }

        $messages = $response->getMessages();

        if ($messages->getResultCode() !== 'Ok') {
            $errorMessage = __('Payment gateway error');
            if ($messages->getMessage() && count($messages->getMessage()) > 0) {
                $errorMessage = $messages->getMessage()[0]->getText();
            }

            return ['success' => false, 'error' => $errorMessage, 'transaction_id' => null];
        }

        $tresponse = $response->getTransactionResponse();

        if ($tresponse === null) {
            return ['success' => false, 'error' => __('Invalid transaction response'), 'transaction_id' => null];
        }

        $responseCode = $tresponse->getResponseCode();

        if ($responseCode === '1') {
            $transactionId = $tresponse->getTransId();
            if (! $transactionId || $transactionId === '0') {
                $transactionId = 'authnet_' . time() . '_' . uniqid();
            }

            return ['success' => true, 'error' => null, 'transaction_id' => (string) $transactionId];
        }

        $errorText = __('Payment declined');
        $errors = $tresponse->getErrors();
        if ($errors && count($errors) > 0) {
            $errorText = $errors[0]->getErrorText();
        }

        return ['success' => false, 'error' => $errorText, 'transaction_id' => null];
    }
}
