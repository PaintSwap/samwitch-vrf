# SamWitchRNG

*Sam Witch (SamWitchRNG &amp; Estfor Kingdom)*

> SamWitchRNG - Random Number Generator

This contract listens for requests for RNG and returns a random number



## Methods

### UPGRADE_INTERFACE_VERSION

```solidity
function UPGRADE_INTERFACE_VERSION() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### consumers

```solidity
function consumers(address consumer) external view returns (uint64 nonce)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| consumer | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| nonce | uint64 | undefined |

### fulfillRandomWords

```solidity
function fulfillRandomWords(uint256 requestId, uint256[] randomWords, address fulfillAddress, uint256 gasAmount) external nonpayable returns (bool callSuccess)
```

Called by the allowed caller to fulfill the request



#### Parameters

| Name | Type | Description |
|---|---|---|
| requestId | uint256 | Request ID |
| randomWords | uint256[] | The random words to assign |
| fulfillAddress | address | Address that will be called to fulfill |
| gasAmount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| callSuccess | bool | If the fulfillment call succeeded |

### initialize

```solidity
function initialize(address _caller) external payable
```

Initialize the contract as part of the proxy contract deployment



#### Parameters

| Name | Type | Description |
|---|---|---|
| _caller | address | undefined |

### owner

```solidity
function owner() external view returns (address)
```



*Returns the address of the current owner.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### proxiableUUID

```solidity
function proxiableUUID() external view returns (bytes32)
```



*Implementation of the ERC1822 {proxiableUUID} function. This returns the storage slot used by the implementation. It is used to validate the implementation&#39;s compatibility when performing an upgrade. IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this function revert if invoked through a proxy. This is guaranteed by the `notDelegated` modifier.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### registerConsumer

```solidity
function registerConsumer(address _consumer) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _consumer | address | undefined |

### renounceOwnership

```solidity
function renounceOwnership() external nonpayable
```



*Leaves the contract without owner. It will not be possible to call `onlyOwner` functions. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby disabling any functionality that is only available to the owner.*


### requestRandomWords

```solidity
function requestRandomWords(uint numWords) external nonpayable returns (uint256 requestId)
```

Called by the requester to make a full request, which provides all of its parameters as arguments



#### Parameters

| Name | Type | Description |
|---|---|---|
| numWords | uint | Number of random words to request |

#### Returns

| Name | Type | Description |
|---|---|---|
| requestId | uint256 | Request ID |

### transferOwnership

```solidity
function transferOwnership(address newOwner) external nonpayable
```



*Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newOwner | address | undefined |

### upgradeToAndCall

```solidity
function upgradeToAndCall(address newImplementation, bytes data) external payable
```



*Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call encoded in `data`. Calls {_authorizeUpgrade}. Emits an {Upgraded} event.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newImplementation | address | undefined |
| data | bytes | undefined |



## Events

### ConsumerRegistered

```solidity
event ConsumerRegistered(address consumer)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| consumer  | address | undefined |

### Initialized

```solidity
event Initialized(uint64 version)
```



*Triggered when the contract has been initialized or reinitialized.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| version  | uint64 | undefined |

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousOwner `indexed` | address | undefined |
| newOwner `indexed` | address | undefined |

### RandomWordsFulfilled

```solidity
event RandomWordsFulfilled(uint256 requestId, uint256[] randomWords)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| requestId  | uint256 | undefined |
| randomWords  | uint256[] | undefined |

### RandomWordsRequested

```solidity
event RandomWordsRequested(uint256 requestId, address fulfillAddress, uint256 numWords)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| requestId  | uint256 | undefined |
| fulfillAddress  | address | undefined |
| numWords  | uint256 | undefined |

### Upgraded

```solidity
event Upgraded(address indexed implementation)
```



*Emitted when the implementation is upgraded.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| implementation `indexed` | address | undefined |



## Errors

### AddressEmptyCode

```solidity
error AddressEmptyCode(address target)
```



*There&#39;s no code at `target` (it is not a contract).*

#### Parameters

| Name | Type | Description |
|---|---|---|
| target | address | undefined |

### ERC1967InvalidImplementation

```solidity
error ERC1967InvalidImplementation(address implementation)
```



*The `implementation` of the proxy is invalid.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| implementation | address | undefined |

### ERC1967NonPayable

```solidity
error ERC1967NonPayable()
```



*An upgrade function sees `msg.value &gt; 0` that may be lost.*


### FailedInnerCall

```solidity
error FailedInnerCall()
```



*A call to an address target failed. The target may have reverted.*


### FulfillmentFailed

```solidity
error FulfillmentFailed(uint256 requestId)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| requestId | uint256 | undefined |

### InvalidConsumer

```solidity
error InvalidConsumer(address consumer)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| consumer | address | undefined |

### InvalidInitialization

```solidity
error InvalidInitialization()
```



*The contract is already initialized.*


### NotInitializing

```solidity
error NotInitializing()
```



*The contract is not initializing.*


### OnlyCaller

```solidity
error OnlyCaller()
```






### OwnableInvalidOwner

```solidity
error OwnableInvalidOwner(address owner)
```



*The owner is not a valid owner account. (eg. `address(0)`)*

#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | undefined |

### OwnableUnauthorizedAccount

```solidity
error OwnableUnauthorizedAccount(address account)
```



*The caller account is not authorized to perform an operation.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined |

### RequestAlreadyFulfilled

```solidity
error RequestAlreadyFulfilled()
```






### RequestIdDoesNotExist

```solidity
error RequestIdDoesNotExist(uint256 requestId)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| requestId | uint256 | undefined |

### UUPSUnauthorizedCallContext

```solidity
error UUPSUnauthorizedCallContext()
```



*The call is from an unauthorized context.*


### UUPSUnsupportedProxiableUUID

```solidity
error UUPSUnsupportedProxiableUUID(bytes32 slot)
```



*The storage `slot` is unsupported as a UUID.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| slot | bytes32 | undefined |


