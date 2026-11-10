import { faker } from '@faker-js/faker';

export interface Address {
  street: string;
  house_number: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

export interface NewUser {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  dob: string;
  phone: string;
  address: Address;
}

/** Every generated user shares this prefix, so leftovers on the shared demo are recognisable. */
export const TEST_EMAIL_DOMAIN = 'example.com';

/**
 * Satisfies the API's password policy: 8+ chars, upper and lower case, a digit and a symbol.
 * The fixed suffix guarantees each class even when faker's random part does not.
 */
const strongPassword = () => `${faker.internet.password({ length: 10, memorable: false })}aA1!`;

export const buildAddress = (overrides: Partial<Address> = {}): Address => ({
  street: faker.location.street().slice(0, 70),
  house_number: String(faker.number.int({ min: 1, max: 300 })),
  city: faker.location.city().slice(0, 40),
  state: faker.location.state().slice(0, 40),
  // The checkout form is a <select> of ISO codes; NL also supports the postcode lookup.
  country: 'NL',
  postal_code: `${faker.number.int({ min: 1000, max: 9999 })}AB`,
  ...overrides,
});

/** A valid, unique user for `POST /users/register`. */
export const buildUser = (overrides: Partial<NewUser> = {}): NewUser => {
  const first = faker.person.firstName();
  const last = faker.person.lastName();
  return {
    // The API caps first_name at 40 and last_name at 20 characters.
    first_name: first.slice(0, 40),
    last_name: last.slice(0, 20),
    email: `pw-${faker.string.alphanumeric({ length: 10, casing: 'lower' })}-${Date.now()}@${TEST_EMAIL_DOMAIN}`,
    password: strongPassword(),
    // Must be 18-75 years ago.
    dob: faker.date.birthdate({ mode: 'age', min: 25, max: 60 }).toISOString().slice(0, 10),
    phone: faker.string.numeric(10),
    address: buildAddress(),
    ...overrides,
  };
};

/** Drops the password: `PUT /users/{id}` takes the profile without it. */
export const toProfile = ({ password: _password, ...profile }: NewUser) => profile;
