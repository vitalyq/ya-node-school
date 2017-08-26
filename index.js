'use strict';

(function appScope(window) {
  // Form validations
  const validator = (function validatorScope() {
    // Domain whitelist for Email validation
    const allowedDomains = [
      'ya.ru', 'yandex.ru', 'yandex.ua',
      'yandex.by', 'yandex.kz', 'yandex.com',
    ];

    // Check if string contains only letters and spaces
    const checkLettersOrSpaces = text => (
      /^[A-Za-z\u00C0-\u1FFF\u2800-\uFFFD ]*$/.test(text)
    );

    // Check if Email's domain is allowed
    const checkDomain = text => (
      allowedDomains.some(domain => (
        text.endsWith(`@${domain}`)
      ))
    );

    // Sum all numbers in a string
    const sumNumbers = text => (
      text.split('').reduce((total, char) => (
        total + (isNaN(char) ? 0 : +char)
      ), 0)
    );

    return {
      validateFio: text => (
        checkLettersOrSpaces(text) &&
        /^\S+ \S+ \S+$/.test(text)
      ),

      validateEmail: text => (
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[^@]+$/.test(text) &&
        checkDomain(text)
      ),

      validatePhone: text => (
        /^\+7\(\d{3}\)\d{3}-\d{2}-\d{2}$/.test(text) &&
        sumNumbers(text) <= 30
      ),
    };
  }());

  // Selectors
  const selectors = {
    checkValidation: state => (
      state.fioIsValid && state.emailIsValid && state.phoneIsValid
    ),

    getInvalidFields: state => (
      [
        !state.fioIsValid ? 'fio' : null,
        !state.emailIsValid ? 'email' : null,
        !state.phoneIsValid ? 'phone' : null,
      ].filter(item => Boolean(item))
    ),
  };

  // Actions
  const actions = {
    editForm: (fio, email, phone) => (
      Object.assign({ type: 'EDIT_FORM' },
        fio !== undefined ? { fio } : null,
        email !== undefined ? { email } : null,
        phone !== undefined ? { phone } : null,
      )
    ),

    validateForm: () => (dispatch, getState) => {
      const { fio, email, phone } = getState();
      dispatch({
        type: 'VALIDATE_FORM',
        fioIsValid: validator.validateFio(fio),
        emailIsValid: validator.validateEmail(email),
        phoneIsValid: validator.validatePhone(phone),
      });
    },

    submitForm: () => async (dispatch, getState) => {
      // Validate the form and check the result
      dispatch(actions.validateForm());
      const state = getState();
      if (!selectors.checkValidation(state)) {
        return;
      }

      // All subsequent fetches send cached data
      const search = new URLSearchParams(
        Object.entries({
          fio: state.fio,
          email: state.email,
          phone: state.phone,
        }),
      );

      dispatch({
        type: 'SUBMIT_FORM_REQUEST',
        formIsSubmitted: true,
      });

      try {
        for (;;) {
          // Wait until timeout expires
          const { retryTimeout } = getState();
          if (retryTimeout > 0) {
            await new Promise(resolve => setTimeout(resolve, retryTimeout));
          }

          // Retrieve form action
          // It's a bad thing to do, but required to comply with the spec
          const action = document.getElementById('myForm').action;

          // Send form data
          const response = await fetch(`${action}?${search}`);
          if (!response.ok) {
            throw Error('Network response was not ok.');
          }

          // Parse response and update the state
          const data = await response.json();
          dispatch({
            type: 'SUBMIT_FORM_SUCCESS',
            formStatus: data.status,
            errorMessage: data.reason || '',
            retryTimeout: data.timeout || 0,
          });

          if (data.status !== 'progress') {
            return;
          }
        }
      } catch (error) {
        dispatch({
          type: 'SUBMIT_FORM_FAILURE',
          formStatus: 'error',
          errorMessage: error.message || 'Something went wrong.',
        });
      }
    },

    // Optional
    setFormAction: action => ({
      type: 'SET_FORM_ACTION',
      formAction: action,
    }),
  };

  // Reducer
  const reducer = (function reducerScope() {
    const defaultState = {
      fio: '',
      email: '',
      phone: '',
      fioIsValid: true,
      emailIsValid: true,
      phoneIsValid: true,
      formAction: 'api/success.json',
      formIsSubmitted: false,
      formStatus: '',
      errorMessage: '',
      retryTimeout: 0,
    };

    // Copy all properties from an action object to the state
    return (state = defaultState, action) => {
      const actionShallowCopy = Object.assign({}, action);
      delete actionShallowCopy.type;
      return Object.assign({}, state, actionShallowCopy);
    };
  }());

  // Components
  const myFormComponent = (store) => {
    // Select elements
    const form = document.getElementById('myForm');
    const { fio, email, phone, submitButton } = form;
    const resultContainer = document.getElementById('resultContainer');

    // DOM mutations depending on state changes
    const domMutations = {
      fio: (val) => { fio.value = val; },
      email: (val) => { email.value = val; },
      phone: (val) => { phone.value = val; },
      fioIsValid: (val) => { fio.classList.toggle('error', !val); },
      emailIsValid: (val) => { email.classList.toggle('error', !val); },
      phoneIsValid: (val) => { phone.classList.toggle('error', !val); },
      formAction: (val) => { form.action = val; },
      formIsSubmitted: (val) => { submitButton.disabled = val; },
      formStatus: (val, state) => {
        let resultText = '';
        if (val === 'success') {
          resultText = 'Success';
        } else if (val === 'error') {
          resultText = state.errorMessage;
        }
        resultContainer.textContent = resultText;
        resultContainer.classList.toggle('success', val === 'success');
        resultContainer.classList.toggle('error', val === 'error');
        resultContainer.classList.toggle('progress', val === 'progress');
      },
    };

    // Subscribe to state updates
    let nextState = store.getState();
    store.subscribe(() => {
      const prevState = nextState;
      nextState = store.getState();

      // Call DOM mutations if relevant parts of the state have changed
      Object.keys(domMutations)
        .filter(key => prevState[key] !== nextState[key])
        .forEach(key => domMutations[key](nextState[key], nextState));
    });

    // Attach event handlers
    form.addEventListener('input', () => {
      store.dispatch(
        actions.editForm(fio.value, email.value, phone.value),
      );
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      store.dispatch(actions.submitForm());
    });
  };

  const debugFormComponent = (store) => {
    // Select elements
    const form = document.getElementById('debugForm');

    // Attach event handlers
    form.addEventListener('click', ({ target }) => {
      if (target.name === 'action') {
        store.dispatch(actions.setFormAction(target.value));
      }
    });

    form.enterValidData.addEventListener('click', () => {
      store.dispatch(actions.editForm(
        'Гоголь Николай Васильевич',
        'example@yandex.ru',
        '+7(000)111-22-33',
      ));
    });

    form.enterInvalidData.addEventListener('click', () => {
      store.dispatch(actions.editForm(
        'Марк Твен',
        'example@gmail.com',
        '+7(000)333-77-01',
      ));
    });

    form.resetForm.addEventListener('click', () => {
      store.dispatch(actions.editForm('', '', ''));
    });
  };

  // Global API
  const initAPI = ({ dispatch, getState }) => ({
    validate() {
      dispatch(actions.validateForm());
      return {
        isValid: selectors.checkValidation(getState()),
        errorFields: selectors.getInvalidFields(getState()),
      };
    },

    getData() {
      const { fio, email, phone } = getState();
      return { fio, email, phone };
    },

    setData(data) {
      if (typeof data === 'object' && data) {
        dispatch(
          actions.editForm(data.fio, data.email, data.phone),
        );
      }
    },

    submit() {
      dispatch(actions.submitForm());
    },
  });

  // Store setup
  const configureStore = () => (
    Redux.createStore(
      reducer,
      Redux.applyMiddleware(ReduxThunk.default),
    )
  );

  // Initialize the app
  const store = configureStore();
  myFormComponent(store);
  debugFormComponent(store);

  // Exports
  window.MyForm = initAPI(store);
}(window));
