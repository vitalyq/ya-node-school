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
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[^@]+/.test(text) &&
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
  };

  // Actions
  const actions = {
    editForm: (fio, email, phone) => ({
      type: 'EDIT_FORM',
      fio,
      email,
      phone,
    }),

    validateForm: () => (dispatch, getState) => {
      const { fio, email, phone } = getState();
      dispatch({
        type: 'VALIDATE_FORM',
        fioIsValid: validator.validateFio(fio),
        emailIsValid: validator.validateEmail(email),
        phoneIsValid: validator.validatePhone(phone),
      });
    },

    submitForm: () => (dispatch, getState) => {
      // Validate the form and check the result
      dispatch(actions.validateForm());
      const state = getState();
      const isValid = selectors.checkValidation(state);
      if (!isValid) {
        return Promise.resolve();
      }

      dispatch({
        type: 'SUBMIT_FORM_REQUEST',
        formIsSubmitted: true,
      });

      const { formAction } = state;
      return fetch(formAction).then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw Error('Network response was not ok.');
      }).then(({ status, reason, timeout }) => {
        dispatch({
          type: 'SUBMIT_FORM_SUCCESS',
          formStatus: status,
          errorMessage: reason || '',
          retryTimeout: timeout || 0,
        });
      });
    },
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

  // Form component
  const formComponent = (form, store) => {
    // Selectors
    const fio = form.fio;
    const email = form.email;
    const phone = form.phone;

    // Subscribe to state updates
    let nextState = {};
    store.subscribe(() => {
      const prevState = nextState;
      nextState = store.getState();

      fio.classList.toggle('error', !nextState.fioIsValid);
      email.classList.toggle('error', !nextState.emailIsValid);
      phone.classList.toggle('error', !nextState.phoneIsValid);
    });

    // Event handlers
    const handleInput = () => {
      store.dispatch(
        actions.editForm(fio.value, email.value, phone.value),
      );
    };

    const handleSubmit = (event) => {
      event.preventDefault();
      store.dispatch(actions.submitForm());
    };

    // Attach event handlers
    fio.addEventListener('input', handleInput);
    email.addEventListener('input', handleInput);
    phone.addEventListener('input', handleInput);
    form.addEventListener('submit', handleSubmit);
  };

  // Store setup
  const configureStore = () => (
    Redux.createStore(
      reducer,
      Redux.applyMiddleware(ReduxThunk.default),
    )
  );

  // Initialize the app
  const store = configureStore();
  formComponent(
    document.getElementById('myForm'),
    store,
  );

  // Global API
  const MyForm = {
    validate() {

    },

    getData() {

    },

    setData(data) {

    },

    submit() {

    },
  };

  // Exports
  window.MyForm = MyForm;
}(window));
