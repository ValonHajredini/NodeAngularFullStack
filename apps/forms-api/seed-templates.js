/**
 * Seed Script: Validated Template Examples
 *
 * Epic 29, Story 29.3: Validated Template Examples & Migration
 *
 * Creates 18 validated template examples (3 per category) that pass
 * CategoryFieldValidator validation rules.
 *
 * Categories:
 * - POLLS (3): Opinion Poll, Customer Feedback Poll, Yes/No Vote
 * - QUIZ (3): Trivia Quiz, Knowledge Assessment, Certification Test
 * - ECOMMERCE (3): Product Order, Multi-Product Catalog, Variant Selection
 * - SERVICES (3): Appointment Booking, Service Request, Time Slot Reservation
 * - DATA_COLLECTION (3): Restaurant Order, Meal Preferences, Catering Request
 * - EVENTS (3): Event RSVP, Ticket Purchase, Guest Registration
 *
 * Run: npm --workspace=apps/forms-api run db:seed
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'nodeangularfullstack',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'dbpassword',
});

/**
 * Template definitions - All 18 validated templates
 */
const TEMPLATES = [
  // ============================================================================
  // POLLS CATEGORY (3 templates)
  // ============================================================================
  {
    name: 'Opinion Poll',
    description: 'General-purpose opinion polling template for gathering public feedback on any topic with vote tracking and duplicate prevention.',
    category: 'polls',
    previewImageUrl: '/assets/templates/opinion-poll-preview.png',
    templateSchema: {
      fields: [
        {
          id: uuidv4(),
          label: 'Poll Question',
          fieldName: 'poll_question',
          type: 'HEADING',
          placeholder: 'What is your opinion on...',
          required: false,
          order: 0
        },
        {
          id: uuidv4(),
          label: 'Select Your Choice',
          fieldName: 'poll_option',
          type: 'SELECT',
          options: [
            { label: 'Strongly Agree', value: 'strongly_agree' },
            { label: 'Agree', value: 'agree' },
            { label: 'Neutral', value: 'neutral' },
            { label: 'Disagree', value: 'disagree' },
            { label: 'Strongly Disagree', value: 'strongly_disagree' }
          ],
          required: true,
          order: 1
        }
      ],
      settings: {
        layout: { columns: 1 },
        submission: {
          confirmationMessage: 'Thank you for voting!',
          redirectUrl: null
        }
      }
    },
    businessLogicConfig: {
      type: 'poll',
      voteField: 'poll_option',
      preventDuplicates: true,
      showResultsAfterVote: true,
      trackingMethod: 'session',
      allowChangeVote: false
    }
  },

  {
    name: 'Customer Feedback Poll',
    description: 'Customer satisfaction polling template with 5-star rating scale for collecting service or product feedback.',
    category: 'polls',
    previewImageUrl: '/assets/templates/customer-feedback-poll-preview.png',
    templateSchema: {
      fields: [
        {
          id: uuidv4(),
          label: 'How would you rate our service?',
          fieldName: 'poll_question',
          type: 'HEADING',
          required: false,
          order: 0
        },
        {
          id: uuidv4(),
          label: 'Your Rating',
          fieldName: 'poll_option',
          type: 'RADIO',
          options: [
            { label: '⭐⭐⭐⭐⭐ Excellent', value: '5_stars' },
            { label: '⭐⭐⭐⭐ Good', value: '4_stars' },
            { label: '⭐⭐⭐ Average', value: '3_stars' },
            { label: '⭐⭐ Below Average', value: '2_stars' },
            { label: '⭐ Poor', value: '1_star' }
          ],
          required: true,
          order: 1
        }
      ],
      settings: {
        layout: { columns: 1 },
        submission: {
          confirmationMessage: 'Thank you for your feedback!',
          redirectUrl: null
        }
      }
    },
    businessLogicConfig: {
      type: 'poll',
      voteField: 'poll_option',
      preventDuplicates: true,
      showResultsAfterVote: false,
      trackingMethod: 'session',
      allowChangeVote: false
    }
  },

  {
    name: 'Yes/No Vote',
    description: 'Simple binary voting template for yes/no questions with quick vote tracking.',
    category: 'polls',
    previewImageUrl: '/assets/templates/yes-no-vote-preview.png',
    templateSchema: {
      fields: [
        {
          id: uuidv4(),
          label: 'Vote on this question',
          fieldName: 'poll_question',
          type: 'HEADING',
          placeholder: 'Should we implement this feature?',
          required: false,
          order: 0
        },
        {
          id: uuidv4(),
          label: 'Your Vote',
          fieldName: 'poll_option',
          type: 'RADIO',
          options: [
            { label: '✅ Yes', value: 'yes' },
            { label: '❌ No', value: 'no' }
          ],
          required: true,
          order: 1
        }
      ],
      settings: {
        layout: { columns: 1 },
        submission: {
          confirmationMessage: 'Vote recorded!',
          redirectUrl: null
        }
      }
    },
    businessLogicConfig: {
      type: 'poll',
      voteField: 'poll_option',
      preventDuplicates: true,
      showResultsAfterVote: true,
      trackingMethod: 'session',
      allowChangeVote: false
    }
  },

  // ============================================================================
  // QUIZ CATEGORY (3 templates)
  // ============================================================================
  {
    name: 'Trivia Quiz',
    description: 'Fun trivia quiz template with 5 multiple-choice questions, automatic scoring, and pass/fail results.',
    category: 'quiz',
    previewImageUrl: '/assets/templates/trivia-quiz-preview.png',
    templateSchema: {
      fields: [
        {
          id: 'q1',
          label: 'Question 1: What is the capital of France?',
          fieldName: 'question_1',
          type: 'RADIO',
          options: [
            { label: 'London', value: 'london' },
            { label: 'Paris', value: 'paris' },
            { label: 'Berlin', value: 'berlin' },
            { label: 'Madrid', value: 'madrid' }
          ],
          required: true,
          metadata: {
            correctAnswer: 'paris',
            points: 1,
            excludeFromQuiz: false
          },
          order: 0
        },
        {
          id: 'q2',
          label: 'Question 2: Which planet is known as the Red Planet?',
          fieldName: 'question_2',
          type: 'RADIO',
          options: [
            { label: 'Venus', value: 'venus' },
            { label: 'Mars', value: 'mars' },
            { label: 'Jupiter', value: 'jupiter' },
            { label: 'Saturn', value: 'saturn' }
          ],
          required: true,
          metadata: {
            correctAnswer: 'mars',
            points: 1,
            excludeFromQuiz: false
          },
          order: 1
        },
        {
          id: 'q3',
          label: 'Question 3: What is 2 + 2?',
          fieldName: 'question_3',
          type: 'RADIO',
          options: [
            { label: '3', value: '3' },
            { label: '4', value: '4' },
            { label: '5', value: '5' },
            { label: '6', value: '6' }
          ],
          required: true,
          metadata: {
            correctAnswer: '4',
            points: 1,
            excludeFromQuiz: false
          },
          order: 2
        },
        {
          id: 'q4',
          label: 'Question 4: Which element has the chemical symbol "O"?',
          fieldName: 'question_4',
          type: 'RADIO',
          options: [
            { label: 'Gold', value: 'gold' },
            { label: 'Oxygen', value: 'oxygen' },
            { label: 'Silver', value: 'silver' },
            { label: 'Iron', value: 'iron' }
          ],
          required: true,
          metadata: {
            correctAnswer: 'oxygen',
            points: 1,
            excludeFromQuiz: false
          },
          order: 3
        },
        {
          id: 'q5',
          label: 'Question 5: In which year did World War II end?',
          fieldName: 'question_5',
          type: 'RADIO',
          options: [
            { label: '1943', value: '1943' },
            { label: '1944', value: '1944' },
            { label: '1945', value: '1945' },
            { label: '1946', value: '1946' }
          ],
          required: true,
          metadata: {
            correctAnswer: '1945',
            points: 1,
            excludeFromQuiz: false
          },
          order: 4
        }
      ],
      settings: {
        layout: { columns: 1 },
        submission: {
          confirmationMessage: 'Quiz submitted! Check your score.',
          redirectUrl: null
        }
      }
    },
    businessLogicConfig: {
      type: 'quiz',
      scoringRules: [
        { fieldId: 'q1', correctAnswer: 'paris', points: 1 },
        { fieldId: 'q2', correctAnswer: 'mars', points: 1 },
        { fieldId: 'q3', correctAnswer: '4', points: 1 },
        { fieldId: 'q4', correctAnswer: 'oxygen', points: 1 },
        { fieldId: 'q5', correctAnswer: '1945', points: 1 }
      ],
      passingScore: 60,
      showResults: true,
      allowRetakes: true
    }
  },

  {
    name: 'Knowledge Assessment',
    description: 'Professional knowledge test template with 10 questions for employee skill assessment or certification prep.',
    category: 'quiz',
    previewImageUrl: '/assets/templates/knowledge-assessment-preview.png',
    templateSchema: {
      fields: Array.from({ length: 10 }, (_, i) => ({
        id: `q${i + 1}`,
        label: `Question ${i + 1}: [Replace with your question]`,
        fieldName: `question_${i + 1}`,
        type: 'RADIO',
        options: [
          { label: 'Option A', value: 'option_a' },
          { label: 'Option B', value: 'option_b' },
          { label: 'Option C', value: 'option_c' },
          { label: 'Option D', value: 'option_d' }
        ],
        required: true,
        metadata: {
          correctAnswer: 'option_a', // Replace with correct answer
          points: 1,
          excludeFromQuiz: false
        },
        order: i
      })),
      settings: {
        layout: { columns: 1 },
        submission: {
          confirmationMessage: 'Assessment completed!',
          redirectUrl: null
        }
      }
    },
    businessLogicConfig: {
      type: 'quiz',
      scoringRules: Array.from({ length: 10 }, (_, i) => ({
        fieldId: `q${i + 1}`,
        correctAnswer: 'option_a', // Replace with correct answers
        points: 1
      })),
      passingScore: 70,
      showResults: true,
      allowRetakes: false
    }
  },

  {
    name: 'Certification Test',
    description: 'Comprehensive certification exam template with 20 questions for formal skill certification.',
    category: 'quiz',
    previewImageUrl: '/assets/templates/certification-test-preview.png',
    templateSchema: {
      fields: Array.from({ length: 20 }, (_, i) => ({
        id: `q${i + 1}`,
        label: `Question ${i + 1}: [Replace with certification question]`,
        fieldName: `question_${i + 1}`,
        type: 'SELECT',
        options: [
          { label: 'Option A', value: 'option_a' },
          { label: 'Option B', value: 'option_b' },
          { label: 'Option C', value: 'option_c' },
          { label: 'Option D', value: 'option_d' }
        ],
        required: true,
        metadata: {
          correctAnswer: 'option_a', // Replace with correct answer
          points: 1,
          excludeFromQuiz: false
        },
        order: i
      })),
      settings: {
        layout: { columns: 1 },
        submission: {
          confirmationMessage: 'Certification exam submitted!',
          redirectUrl: null
        }
      }
    },
    businessLogicConfig: {
      type: 'quiz',
      scoringRules: Array.from({ length: 20 }, (_, i) => ({
        fieldId: `q${i + 1}`,
        correctAnswer: 'option_a', // Replace with correct answers
        points: 1
      })),
      passingScore: 80,
      showResults: true,
      allowRetakes: false
    }
  },

  // ============================================================================
  // ECOMMERCE CATEGORY (3 templates)
  // ============================================================================
  {
    name: 'Product Order Form',
    description: 'Simple product order form with product selection, quantity input, and price calculation for e-commerce.',
    category: 'ecommerce',
    previewImageUrl: '/assets/templates/product-order-preview.png',
    templateSchema: {
      fields: [
        {
          id: uuidv4(),
          label: 'Select Product',
          fieldName: 'product_id',
          type: 'SELECT',
          options: [
            { label: 'Product A - $19.99', value: 'product_a' },
            { label: 'Product B - $29.99', value: 'product_b' },
            { label: 'Product C - $39.99', value: 'product_c' },
            { label: 'Product D - $49.99', value: 'product_d' }
          ],
          required: true,
          order: 0
        },
        {
          id: uuidv4(),
          label: 'Quantity',
          fieldName: 'quantity',
          type: 'NUMBER',
          placeholder: '1',
          required: true,
          validation: { min: 1, max: 100 },
          order: 1
        },
        {
          id: uuidv4(),
          label: 'Price per Unit',
          fieldName: 'price',
          type: 'NUMBER',
          placeholder: '0.00',
          required: true,
          validation: { min: 0 },
          order: 2
        }
      ],
      settings: {
        layout: { columns: 1 },
        submission: {
          confirmationMessage: 'Order received!',
          redirectUrl: null
        }
      }
    },
    businessLogicConfig: {
      type: 'inventory',
      stockField: 'product_id',
      variantField: 'size',
      quantityField: 'quantity',
      stockTable: 'inventory',
      threshold: 10,
      decrementOnSubmit: true
    }
  },

  {
    name: 'Multi-Product Catalog',
    description: 'Multiple product selection form with categories, inventory tracking, and bulk ordering support.',
    category: 'ecommerce',
    previewImageUrl: '/assets/templates/multi-product-catalog-preview.png',
    templateSchema: {
      fields: [
        {
          id: uuidv4(),
          label: 'Product Category',
          fieldName: 'category',
          type: 'SELECT',
          options: [
            { label: 'Electronics', value: 'electronics' },
            { label: 'Clothing', value: 'clothing' },
            { label: 'Home & Garden', value: 'home_garden' },
            { label: 'Sports', value: 'sports' }
          ],
          required: true,
          order: 0
        },
        {
          id: uuidv4(),
          label: 'Select Product',
          fieldName: 'product_id',
          type: 'SELECT',
          options: [
            { label: 'Product 1', value: 'prod_1' },
            { label: 'Product 2', value: 'prod_2' },
            { label: 'Product 3', value: 'prod_3' }
          ],
          required: true,
          order: 1
        },
        {
          id: uuidv4(),
          label: 'Quantity',
          fieldName: 'quantity',
          type: 'NUMBER',
          placeholder: '1',
          required: true,
          validation: { min: 1, max: 999 },
          order: 2
        },
        {
          id: uuidv4(),
          label: 'Unit Price',
          fieldName: 'price',
          type: 'NUMBER',
          placeholder: '0.00',
          required: true,
          validation: { min: 0 },
          order: 3
        }
      ],
      settings: {
        layout: { columns: 2 },
        submission: {
          confirmationMessage: 'Products added to cart!',
          redirectUrl: null
        }
      }
    },
    businessLogicConfig: {
      type: 'inventory',
      stockField: 'product_id',
      variantField: 'category',
      quantityField: 'quantity',
      stockTable: 'inventory',
      threshold: 5,
      decrementOnSubmit: true
    }
  },

  {
    name: 'Variant Selection Form',
    description: 'Product order form with size and color variants, dynamic pricing, and inventory management.',
    category: 'ecommerce',
    previewImageUrl: '/assets/templates/variant-selection-preview.png',
    templateSchema: {
      fields: [
        {
          id: uuidv4(),
          label: 'Product',
          fieldName: 'product_id',
          type: 'SELECT',
          options: [
            { label: 'T-Shirt', value: 'tshirt' },
            { label: 'Hoodie', value: 'hoodie' },
            { label: 'Jacket', value: 'jacket' }
          ],
          required: true,
          order: 0
        },
        {
          id: uuidv4(),
          label: 'Size',
          fieldName: 'size',
          type: 'RADIO',
          options: [
            { label: 'Small', value: 'S' },
            { label: 'Medium', value: 'M' },
            { label: 'Large', value: 'L' },
            { label: 'XL', value: 'XL' }
          ],
          required: true,
          order: 1
        },
        {
          id: uuidv4(),
          label: 'Color',
          fieldName: 'color',
          type: 'RADIO',
          options: [
            { label: 'Black', value: 'black' },
            { label: 'White', value: 'white' },
            { label: 'Blue', value: 'blue' },
            { label: 'Red', value: 'red' }
          ],
          required: true,
          order: 2
        },
        {
          id: uuidv4(),
          label: 'Quantity',
          fieldName: 'quantity',
          type: 'NUMBER',
          placeholder: '1',
          required: true,
          validation: { min: 1, max: 50 },
          order: 3
        },
        {
          id: uuidv4(),
          label: 'Price',
          fieldName: 'price',
          type: 'NUMBER',
          placeholder: '0.00',
          required: true,
          validation: { min: 0 },
          order: 4
        }
      ],
      settings: {
        layout: { columns: 2 },
        submission: {
          confirmationMessage: 'Added to cart!',
          redirectUrl: null
        }
      }
    },
    businessLogicConfig: {
      type: 'inventory',
      stockField: 'product_id',
      variantField: 'size',
      quantityField: 'quantity',
      stockTable: 'inventory',
      threshold: 10,
      decrementOnSubmit: true
    }
  },

  // ============================================================================
  // SERVICES CATEGORY (3 templates)
  // ============================================================================
  {
    name: 'Appointment Booking',
    description: 'Standard appointment scheduling template with date and time slot selection for service bookings.',
    category: 'services',
    previewImageUrl: '/assets/templates/appointment-booking-preview.png',
    templateSchema: {
      fields: [
        {
          id: uuidv4(),
          label: 'Appointment Date',
          fieldName: 'date',
          type: 'DATE',
          required: true,
          order: 0
        },
        {
          id: uuidv4(),
          label: 'Time Slot',
          fieldName: 'time_slot',
          type: 'TIME_SLOT',
          options: [
            { label: '9:00 AM - 10:00 AM', value: '09:00-10:00' },
            { label: '10:00 AM - 11:00 AM', value: '10:00-11:00' },
            { label: '11:00 AM - 12:00 PM', value: '11:00-12:00' },
            { label: '1:00 PM - 2:00 PM', value: '13:00-14:00' },
            { label: '2:00 PM - 3:00 PM', value: '14:00-15:00' },
            { label: '3:00 PM - 4:00 PM', value: '15:00-16:00' }
          ],
          required: true,
          order: 1
        },
        {
          id: uuidv4(),
          label: 'Your Name',
          fieldName: 'name',
          type: 'TEXT',
          placeholder: 'Full name',
          required: true,
          order: 2
        },
        {
          id: uuidv4(),
          label: 'Email',
          fieldName: 'email',
          type: 'EMAIL',
          placeholder: 'your@email.com',
          required: true,
          order: 3
        }
      ],
      settings: {
        layout: { columns: 1 },
        submission: {
          confirmationMessage: 'Appointment booked!',
          redirectUrl: null
        }
      }
    },
    businessLogicConfig: {
      type: 'appointment',
      timeSlotField: 'time_slot',
      dateField: 'date',
      maxBookingsPerSlot: 1,
      bookingsTable: 'appointments',
      allowOverbook: false
    }
  },

  {
    name: 'Service Request Form',
    description: 'Service selection and scheduling template with service type, date, time, and contact information.',
    category: 'services',
    previewImageUrl: '/assets/templates/service-request-preview.png',
    templateSchema: {
      fields: [
        {
          id: uuidv4(),
          label: 'Service Type',
          fieldName: 'service_type',
          type: 'SELECT',
          options: [
            { label: 'Consultation', value: 'consultation' },
            { label: 'Repair', value: 'repair' },
            { label: 'Installation', value: 'installation' },
            { label: 'Maintenance', value: 'maintenance' }
          ],
          required: true,
          order: 0
        },
        {
          id: uuidv4(),
          label: 'Preferred Date',
          fieldName: 'date',
          type: 'DATE',
          required: true,
          order: 1
        },
        {
          id: uuidv4(),
          label: 'Preferred Time',
          fieldName: 'time_slot',
          type: 'SELECT',
          options: [
            { label: 'Morning (8 AM - 12 PM)', value: 'morning' },
            { label: 'Afternoon (12 PM - 5 PM)', value: 'afternoon' },
            { label: 'Evening (5 PM - 8 PM)', value: 'evening' }
          ],
          required: true,
          order: 2
        },
        {
          id: uuidv4(),
          label: 'Contact Name',
          fieldName: 'contact_name',
          type: 'TEXT',
          required: true,
          order: 3
        },
        {
          id: uuidv4(),
          label: 'Phone Number',
          fieldName: 'phone',
          type: 'PHONE',
          required: true,
          order: 4
        }
      ],
      settings: {
        layout: { columns: 1 },
        submission: {
          confirmationMessage: 'Service request submitted!',
          redirectUrl: null
        }
      }
    },
    businessLogicConfig: {
      type: 'appointment',
      timeSlotField: 'time_slot',
      dateField: 'date',
      maxBookingsPerSlot: 3,
      bookingsTable: 'appointments',
      allowOverbook: false
    }
  },

  {
    name: 'Time Slot Reservation',
    description: 'Event time slot booking template with capacity management and attendee count tracking.',
    category: 'services',
    previewImageUrl: '/assets/templates/time-slot-reservation-preview.png',
    templateSchema: {
      fields: [
        {
          id: uuidv4(),
          label: 'Event Date',
          fieldName: 'date',
          type: 'DATE',
          required: true,
          order: 0
        },
        {
          id: uuidv4(),
          label: 'Time Slot',
          fieldName: 'time_slot',
          type: 'TIME_SLOT',
          options: [
            { label: '10:00 AM - 12:00 PM', value: '10:00-12:00' },
            { label: '12:00 PM - 2:00 PM', value: '12:00-14:00' },
            { label: '2:00 PM - 4:00 PM', value: '14:00-16:00' },
            { label: '4:00 PM - 6:00 PM', value: '16:00-18:00' }
          ],
          required: true,
          order: 1
        },
        {
          id: uuidv4(),
          label: 'Number of Attendees',
          fieldName: 'attendee_count',
          type: 'NUMBER',
          placeholder: '1',
          required: true,
          validation: { min: 1, max: 10 },
          order: 2
        },
        {
          id: uuidv4(),
          label: 'Organizer Name',
          fieldName: 'organizer_name',
          type: 'TEXT',
          required: true,
          order: 3
        }
      ],
      settings: {
        layout: { columns: 1 },
        submission: {
          confirmationMessage: 'Time slot reserved!',
          redirectUrl: null
        }
      }
    },
    businessLogicConfig: {
      type: 'appointment',
      timeSlotField: 'time_slot',
      dateField: 'date',
      maxBookingsPerSlot: 5,
      bookingsTable: 'appointments',
      allowOverbook: false
    }
  },

  // ============================================================================
  // DATA_COLLECTION CATEGORY (3 templates)
  // ============================================================================
  {
    name: 'Restaurant Order Form',
    description: 'Menu ordering template with item selection, quantity, and order total calculation for restaurants.',
    category: 'data_collection',
    previewImageUrl: '/assets/templates/restaurant-order-preview.png',
    templateSchema: {
      fields: [
        {
          id: uuidv4(),
          label: 'Menu Item',
          fieldName: 'menu_item',
          type: 'SELECT',
          options: [
            { label: 'Burger - $12.99', value: 'burger' },
            { label: 'Pizza - $15.99', value: 'pizza' },
            { label: 'Pasta - $13.99', value: 'pasta' },
            { label: 'Salad - $9.99', value: 'salad' },
            { label: 'Fries - $4.99', value: 'fries' }
          ],
          required: true,
          order: 0
        },
        {
          id: uuidv4(),
          label: 'Quantity',
          fieldName: 'quantity',
          type: 'NUMBER',
          placeholder: '1',
          required: true,
          validation: { min: 1, max: 20 },
          order: 1
        },
        {
          id: uuidv4(),
          label: 'Special Instructions',
          fieldName: 'special_instructions',
          type: 'TEXTAREA',
          placeholder: 'Any special requests?',
          required: false,
          order: 2
        }
      ],
      settings: {
        layout: { columns: 1 },
        submission: {
          confirmationMessage: 'Order placed!',
          redirectUrl: null
        }
      }
    },
    businessLogicConfig: {
      type: 'order',
      itemFields: ['menu_item'],
      calculateTotal: true,
      taxRate: 0.08,
      shippingField: null
    }
  },

  {
    name: 'Meal Preferences Survey',
    description: 'Dietary preferences collection template for catering, events, or meal planning services.',
    category: 'data_collection',
    previewImageUrl: '/assets/templates/meal-preferences-preview.png',
    templateSchema: {
      fields: [
        {
          id: uuidv4(),
          label: 'Preferred Meal Type',
          fieldName: 'menu_item',
          type: 'SELECT',
          options: [
            { label: 'Vegetarian', value: 'vegetarian' },
            { label: 'Vegan', value: 'vegan' },
            { label: 'Gluten-Free', value: 'gluten_free' },
            { label: 'Regular', value: 'regular' },
            { label: 'Pescatarian', value: 'pescatarian' }
          ],
          required: true,
          order: 0
        },
        {
          id: uuidv4(),
          label: 'Number of Meals',
          fieldName: 'quantity',
          type: 'NUMBER',
          placeholder: '1',
          required: true,
          validation: { min: 1, max: 10 },
          order: 1
        },
        {
          id: uuidv4(),
          label: 'Allergies',
          fieldName: 'allergies',
          type: 'TEXTAREA',
          placeholder: 'List any food allergies',
          required: false,
          order: 2
        },
        {
          id: uuidv4(),
          label: 'Additional Notes',
          fieldName: 'notes',
          type: 'TEXTAREA',
          placeholder: 'Any other dietary requirements?',
          required: false,
          order: 3
        }
      ],
      settings: {
        layout: { columns: 1 },
        submission: {
          confirmationMessage: 'Preferences saved!',
          redirectUrl: null
        }
      }
    },
    businessLogicConfig: {
      type: 'order',
      itemFields: ['menu_item'],
      calculateTotal: false,
      taxRate: 0,
      shippingField: null
    }
  },

  {
    name: 'Catering Request',
    description: 'Bulk catering order form with menu selection, quantity, delivery date, and event details.',
    category: 'data_collection',
    previewImageUrl: '/assets/templates/catering-request-preview.png',
    templateSchema: {
      fields: [
        {
          id: uuidv4(),
          label: 'Menu Package',
          fieldName: 'menu_item',
          type: 'SELECT',
          options: [
            { label: 'Breakfast Package - $15/person', value: 'breakfast' },
            { label: 'Lunch Package - $20/person', value: 'lunch' },
            { label: 'Dinner Package - $30/person', value: 'dinner' },
            { label: 'Appetizer Package - $12/person', value: 'appetizers' }
          ],
          required: true,
          order: 0
        },
        {
          id: uuidv4(),
          label: 'Number of Guests',
          fieldName: 'quantity',
          type: 'NUMBER',
          placeholder: '50',
          required: true,
          validation: { min: 10, max: 1000 },
          order: 1
        },
        {
          id: uuidv4(),
          label: 'Delivery Date',
          fieldName: 'delivery_date',
          type: 'DATE',
          required: true,
          order: 2
        },
        {
          id: uuidv4(),
          label: 'Event Type',
          fieldName: 'event_type',
          type: 'SELECT',
          options: [
            { label: 'Corporate Event', value: 'corporate' },
            { label: 'Wedding', value: 'wedding' },
            { label: 'Birthday Party', value: 'birthday' },
            { label: 'Conference', value: 'conference' },
            { label: 'Other', value: 'other' }
          ],
          required: true,
          order: 3
        }
      ],
      settings: {
        layout: { columns: 2 },
        submission: {
          confirmationMessage: 'Catering request submitted!',
          redirectUrl: null
        }
      }
    },
    businessLogicConfig: {
      type: 'order',
      itemFields: ['menu_item'],
      calculateTotal: true,
      taxRate: 0.08,
      shippingField: 'delivery_date'
    }
  },

  // ============================================================================
  // EVENTS CATEGORY (3 templates)
  // ============================================================================
  {
    name: 'Event RSVP Form',
    description: 'Basic RSVP template with yes/no/maybe responses for event invitations and attendance tracking.',
    category: 'events',
    previewImageUrl: '/assets/templates/event-rsvp-preview.png',
    templateSchema: {
      fields: [
        {
          id: uuidv4(),
          label: 'Your Name',
          fieldName: 'attendee_name',
          type: 'TEXT',
          placeholder: 'Full name',
          required: true,
          order: 0
        },
        {
          id: uuidv4(),
          label: 'RSVP Status',
          fieldName: 'rsvp_status',
          type: 'RADIO',
          options: [
            { label: '✅ Yes, I will attend', value: 'attending' },
            { label: '❌ No, I cannot attend', value: 'not_attending' },
            { label: '❓ Maybe', value: 'maybe' }
          ],
          required: true,
          order: 1
        },
        {
          id: uuidv4(),
          label: 'Email',
          fieldName: 'email',
          type: 'EMAIL',
          placeholder: 'your@email.com',
          required: true,
          order: 2
        }
      ],
      settings: {
        layout: { columns: 1 },
        submission: {
          confirmationMessage: 'RSVP received!',
          redirectUrl: null
        }
      }
    },
    businessLogicConfig: {
      type: 'appointment',
      timeSlotField: 'rsvp_status',
      dateField: 'event_date',
      maxBookingsPerSlot: 100,
      bookingsTable: 'appointments',
      allowOverbook: true
    }
  },

  {
    name: 'Ticket Purchase Form',
    description: 'Paid ticket sales template with ticket type selection, quantity, and payment processing.',
    category: 'events',
    previewImageUrl: '/assets/templates/ticket-purchase-preview.png',
    templateSchema: {
      fields: [
        {
          id: uuidv4(),
          label: 'Your Name',
          fieldName: 'attendee_name',
          type: 'TEXT',
          placeholder: 'Full name',
          required: true,
          order: 0
        },
        {
          id: uuidv4(),
          label: 'Ticket Type',
          fieldName: 'rsvp_status',
          type: 'SELECT',
          options: [
            { label: 'General Admission - $50', value: 'general' },
            { label: 'VIP - $150', value: 'vip' },
            { label: 'Student - $30', value: 'student' }
          ],
          required: true,
          order: 1
        },
        {
          id: uuidv4(),
          label: 'Number of Tickets',
          fieldName: 'quantity',
          type: 'NUMBER',
          placeholder: '1',
          required: true,
          validation: { min: 1, max: 10 },
          order: 2
        },
        {
          id: uuidv4(),
          label: 'Email',
          fieldName: 'email',
          type: 'EMAIL',
          placeholder: 'your@email.com',
          required: true,
          order: 3
        }
      ],
      settings: {
        layout: { columns: 1 },
        submission: {
          confirmationMessage: 'Tickets purchased!',
          redirectUrl: null
        }
      }
    },
    businessLogicConfig: {
      type: 'appointment',
      timeSlotField: 'rsvp_status',
      dateField: 'event_date',
      maxBookingsPerSlot: 500,
      bookingsTable: 'appointments',
      allowOverbook: false
    }
  },

  {
    name: 'Guest Registration',
    description: 'Detailed attendee registration template with contact information, dietary preferences, and special requirements.',
    category: 'events',
    previewImageUrl: '/assets/templates/guest-registration-preview.png',
    templateSchema: {
      fields: [
        {
          id: uuidv4(),
          label: 'Full Name',
          fieldName: 'attendee_name',
          type: 'TEXT',
          placeholder: 'First and last name',
          required: true,
          order: 0
        },
        {
          id: uuidv4(),
          label: 'Attendance Status',
          fieldName: 'rsvp_status',
          type: 'RADIO',
          options: [
            { label: 'Attending', value: 'confirmed' },
            { label: 'Not Attending', value: 'declined' }
          ],
          required: true,
          order: 1
        },
        {
          id: uuidv4(),
          label: 'Email Address',
          fieldName: 'email',
          type: 'EMAIL',
          placeholder: 'your@email.com',
          required: true,
          order: 2
        },
        {
          id: uuidv4(),
          label: 'Phone Number',
          fieldName: 'phone',
          type: 'PHONE',
          required: true,
          order: 3
        },
        {
          id: uuidv4(),
          label: 'Dietary Restrictions',
          fieldName: 'dietary_restrictions',
          type: 'CHECKBOX',
          options: [
            { label: 'Vegetarian', value: 'vegetarian' },
            { label: 'Vegan', value: 'vegan' },
            { label: 'Gluten-Free', value: 'gluten_free' },
            { label: 'Nut Allergy', value: 'nut_allergy' }
          ],
          required: false,
          order: 4
        }
      ],
      settings: {
        layout: { columns: 1 },
        submission: {
          confirmationMessage: 'Registration complete!',
          redirectUrl: null
        }
      }
    },
    businessLogicConfig: {
      type: 'appointment',
      timeSlotField: 'rsvp_status',
      dateField: 'event_date',
      maxBookingsPerSlot: 200,
      bookingsTable: 'appointments',
      allowOverbook: false
    }
  }
];

/**
 * Main seed function
 */
async function seedTemplates() {
  const client = await pool.connect();

  try {
    console.log('\n🌱 Starting template seeding...\n');

    // Begin transaction
    await client.query('BEGIN');

    // Optional: Remove old templates (only if they exist)
    console.log('🗑️  Removing old template seed data...');
    await client.query(`
      DELETE FROM form_templates
      WHERE name IN (
        'Home Service Request',
        'Handyman Request',
        'Cleaning Service Booking'
      )
    `);
    console.log('✓ Old templates removed\n');

    // Insert new templates
    let successCount = 0;
    let errorCount = 0;

    for (const template of TEMPLATES) {
      try {
        console.log(`📝 Processing template: ${template.name}...`);

        // Check if template already exists
        const existingTemplate = await client.query(
          'SELECT id FROM form_templates WHERE name = $1',
          [template.name]
        );

        if (existingTemplate.rows.length > 0) {
          console.log(`  ℹ️  Template already exists, skipping: ${template.name}`);
          successCount++;
          continue;
        }

        // Insert new template
        const query = `
          INSERT INTO form_templates (
            id, name, description, category, preview_image_url,
            template_schema, business_logic_config, is_active, usage_count,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;

        const values = [
          uuidv4(),
          template.name,
          template.description,
          template.category,
          template.previewImageUrl || null,
          JSON.stringify(template.templateSchema),
          JSON.stringify(template.businessLogicConfig),
          true, // isActive
          0, // usageCount
          new Date(),
          new Date()
        ];

        await client.query(query, values);
        console.log(`  ✓ Template created: ${template.name}`);
        successCount++;
      } catch (error) {
        console.error(`  ✗ Error processing template "${template.name}":`, error.message);
        errorCount++;
        // Don't throw - continue with other templates
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n═══════════════════════════════════════════════');
    console.log(`✓ Template seeding complete!`);
    console.log(`  Success: ${successCount}/${TEMPLATES.length} templates`);
    if (errorCount > 0) {
      console.log(`  Errors: ${errorCount} templates failed`);
    }
    console.log('═══════════════════════════════════════════════\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n✗ Template seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seed function
if (require.main === module) {
  seedTemplates()
    .then(() => {
      console.log('✓ Seed script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Seed script failed:', error);
      process.exit(1);
    });
}

module.exports = { seedTemplates, TEMPLATES };
