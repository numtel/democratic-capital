# Contract Hierarchy

The root of Democratic Capital links to the original `VerifiedGroupFactory` instance. From this instance, anybody can deploy a new group, a `VerifiedGroup` instance.

The creator of a group automatically becomes its first member. While there is only one member of a group, that account has full administrator access to all the methods available on the `VerifiedGroup` contract.

Before the group accepts a second member, this administrator should allow a factory for an election type, deploy a new election contract with a wide-enough filter for any operation, and allow that new election contract access to invoke on behalf of the group.

If an election contract like this is not allowed to invoke on behalf of the group and another member joins, the first user will lose their administrator capabilities.

As another method of administration, an individual user's account address may be allowed to invoke on behalf of the group, making them an absolute administrator.

## Election Types

All election types must specify their allowed invoke prefixes at time of deployment. These invoke prefixes are a set of contract addresses and function signatures that are allowed to be invoked by proposals from the election contract.

If no prefixes are set, the elections may invoke any contract and method.

This allows a group to maintain different rules for invoking different contracts and methods. For example, trivial matters may require lower passing thresholds and minimum participation than more serious contracts and methods.

It is up to the group to determine how to balance their electoral power.

Each proposal contains a set of transactions that will be invoked if the proposal passes.

Proposals can reference up to 9 contracts deployed within the proposal with special addresses that are replaced by the deployed instance address when the proposal is invoked. e.g. 0x1111111111111111111111111111111111111111 refers to the first deployed contract.

### ElectionsSimple

The simplest type of elections which specify the proposal duration, passing threshold, and minimum participation percentage at deployment time.

### ElectionsSimpleQuadratic

Like the previous, except votes can include a payment in a specified token that increases the power of the vote by the square root of the payment amount.

### ElectionsByMedian

Proposal duration, passing threshold, and minimum participation are set by calculating the median value of member-submitted ballots, giving more democratic power to how the elections proceed.

## Membership Management

### OpenRegistrations

Allow any account to become a member simply by clicking a button.

### RegistrationsByFee

Allow any account to become a member by paying a fee in a specified token.

### RegistrationsByElection

Wishful new members submit a proposal under a given election contract with the hope that existing members will approve their membership.

### OpenUnregistrations

Allow any member to exit the group by simply clicking a button.

## ERC20 Token Types

### ERC20Mintable

A standard ERC20 token with a method that allows the group to mint any amount to a specified account.

### ERC20LiquidityPool

A subclass of the ERC20Mintable that allows swapping between two different tokens. The mintable nature of these pools allows the group to elect to dilute liquidity, and potentially manipulate the price.

### MemberTokenEmissions

An add-on for `ERC20Mintable` contracts to provide emissions to members of the group at regular intervals.

## Other Types

### Fundraiser

Specify a token type, amount, and end time for a fundraising campaign. Depositors will be able to withdraw after the end time if the amount is not reached. If the amount is reached, the group will be able to transfer the raised funds as they wish.

### Anything else?

Write your own self-describing contract, deploy it, and begin using it on your groups immediately.

Or submit a Pull Request with your new contract type so everybody has easy access to your creation.
