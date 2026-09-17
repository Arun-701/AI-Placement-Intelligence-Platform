from app.services.ontology_service import normalize_and_merge
from app.services.topic_discovery_service import discover_topics


FULL_STACK_QUESTIONS = [
    'What is React and how do React components work?',
    'Explain controlled and uncontrolled components in React state management.',
    'How do React forms handle state updates?',
    'What are AJAX requests in JavaScript?',
    'Explain how AJAX forms improve user interaction.',
    'What are Bootstrap classes in web design?',
    'Describe the use of Node.js in server-side applications.',
    'How does MongoDB store JSON documents?',
    'What is Full Stack Development?',
    'How do HTML and CSS design responsive pages?',
    'What is the difference between HTML and CSS?',
    'What is the purpose of a web page in document design?',
    'Explain the role of users in web applications.',
]


def test_generic_keywords_are_not_promoted_to_top_level_topics():
    topics = discover_topics(FULL_STACK_QUESTIONS)
    labels = {topic['label'] for topic in topics}

    assert {'React', 'AJAX', 'Bootstrap', 'Node.js', 'MongoDB', 'Full Stack Development', 'HTML'} <= labels
    assert labels.isdisjoint({
        'Web', 'Page', 'Text', 'Content', 'Area', 'Users', 'Paragraph', 'Password',
        'Featured', 'External', 'Return', 'Command', 'Data', 'Multiple', 'Creating',
        'Does', 'State', 'Container', 'Uncontrolled', 'Web Page', 'Stack Development'
    })


def test_duplicate_concepts_are_merged_before_ranking():
    clusters = [
        {'label': 'AJAX', 'subtopics': [], 'indices': [0, 1], 'confidence': 0.9, 'representativeQuestion': 'What are AJAX requests in JavaScript?', 'representativeQuestions': ['What are AJAX requests in JavaScript?']},
        {'label': 'AJAX Based', 'subtopics': [], 'indices': [2], 'confidence': 0.8, 'representativeQuestion': 'How do AJAX based forms work?', 'representativeQuestions': ['How do AJAX based forms work?']},
        {'label': 'Node', 'subtopics': [], 'indices': [3], 'confidence': 0.9, 'representativeQuestion': 'Explain Node.js server-side programming.', 'representativeQuestions': ['Explain Node.js server-side programming.']},
        {'label': 'Nodejs', 'subtopics': [], 'indices': [4], 'confidence': 0.9, 'representativeQuestion': 'How is Node.js used?', 'representativeQuestions': ['How is Node.js used?']},
    ]
    questions = [
        'What are AJAX requests in JavaScript?',
        'Explain AJAX based forms in web applications.',
        'How do AJAX based forms work?',
        'Explain Node.js server-side programming.',
        'How is Node.js used?'
    ]

    merged = normalize_and_merge(clusters, questions)
    labels = {topic['label'] for topic in merged}

    assert {'AJAX', 'Node.js'} <= labels
    assert len(labels) == 2


def test_generic_phrase_normalization_for_compiler_design_questions():
    questions = [
        'When do dangling references mean?',
        'List the steps in performing LL parsing.',
        'Explain optimization techniques.',
        'Explain optimization technique.',
    ]

    topics = discover_topics(questions)
    labels = {topic['label'] for topic in topics}
    hierarchy = {topic['label']: topic['subtopics'] for topic in topics}

    assert 'Dangling References' in labels
    assert 'Parsing' in labels
    assert 'Optimization' in labels
    assert any('LL Parsing' in value for value in hierarchy.values())


def test_final_semantic_validation_rejects_action_only_and_ocr_fragments():
    questions = [
        'When do you call a variable syntactically live at a point?',
        'List out the steps in performing LL parsing.',
        'When does dangling references mean?',
        'Compare and contrast Interpreter and Compiler.',
        'Explain optimization techniques.',
        'Explain inheritance.',
        'Explain different types of inheritance.',
    ]

    topics = discover_topics(questions)
    labels = {topic['label'] for topic in topics}

    assert {'Liveness Analysis', 'Parsing', 'Dangling References', 'Compiler vs Interpreter', 'Optimization', 'Inheritance'} <= labels
    assert labels.isdisjoint({'Recognize', 'Address', 'String', 'Contrast Interpreter', 'Live', 'LI Parsing', 'Dangling Reference', 'Explain', 'Types'})


def test_invalid_fragment_ends_is_rejected_and_generic_intent_words_are_filtered():
    questions = [
        'Explain the ends of a regular expression.',
        'What does a compiler do?',
        'List the steps in LL parsing.',
        'Explain the meaning of optimization.',
    ]

    topics = discover_topics(questions)
    labels = {topic['label'] for topic in topics}

    assert 'Ends' not in labels
    assert 'Mean' not in labels
    assert 'Does' not in labels
    assert 'List' not in labels
    assert 'Explain' not in labels
    assert 'Regular Expressions' in labels or 'Regular Expression' in labels
    assert 'LL Parsing' in labels or 'Parsing' in labels


def test_generic_parent_subtopic_hierarchy_for_peephole_and_ll_parsing():
    questions = [
        'Explain peephole optimization in compiler optimization.',
        'List out the steps in performing LL parsing.',
    ]

    topics = discover_topics(questions)
    labels = {topic['label'] for topic in topics}
    hierarchy = {topic['label']: topic['subtopics'] for topic in topics}

    assert 'Optimization' in labels
    assert 'Parsing' in labels
    assert any('Peephole Optimization' in value for value in hierarchy.values())
    assert any('LL Parsing' in value for value in hierarchy.values())


def test_liveness_analysis_is_grouped_under_flow_analysis():
    questions = [
        'Explain flow analysis and liveness analysis in compiler theory.',
        'When do you call a variable syntactically live at a point?',
    ]

    topics = discover_topics(questions)
    labels = {topic['label'] for topic in topics}

    assert 'Flow Analysis' in labels
    assert 'Liveness Analysis' in labels


def test_singular_plural_and_generic_normalization():
    questions = [
        'Explain dangling references in compiler construction.',
        'What are regular expressions in lexical analysis?',
        'Compare and contrast Interpreter and Compiler.',
    ]

    topics = discover_topics(questions)
    labels = {topic['label'] for topic in topics}

    assert 'Dangling References' in labels
    assert 'Regular Expressions' in labels
    assert 'Compiler vs Interpreter' in labels
