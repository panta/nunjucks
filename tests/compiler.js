var should = require('should');
var render = require('./util').render;

describe('compiler', function() {
    it('should compile templates', function() {
        var s = render('Hello world');
        s.should.equal('Hello world');

        s = render('Hello world, {{ name }}',
                   { name: 'James' });
        s.should.equal('Hello world, James');

        s = render('Hello world, {{name}}{{suffix}}, how are you',
                   { name: 'James',
                     suffix: ' Long'});
        s.should.equal('Hello world, James Long, how are you');
    });

    it('should compile references', function() {
        var s = render('{{ foo.bar }}',
                       { foo: { bar: 'baz' }});
        s.should.equal('baz');

        s = render('{{ foo["bar"] }}',
                   { foo: { bar: 'baz' }});
        s.should.equal('baz');
    });

    it('should compile function calls', function() {
        var s = render('{{ foo("msg") }}',
                       { foo: function(str) { return str + 'hi'; }});
        s.should.equal('msghi');
    });

    it('should compile if blocks', function() {
        var tmpl = ('Give me some {% if hungry %}pizza' +
                    '{% else %}water{% endif %}');

        var s = render(tmpl, { hungry: true });
        s.should.equal('Give me some pizza');

        s = render(tmpl, { hungry: false });
        s.should.equal('Give me some water');

        s = render('{% if not hungry %}good{% endif %}',
                   { hungry: false });
        s.should.equal('good');

        s = render('{% if hungry and like_pizza %}good{% endif %}',
            { hungry: true, like_pizza: true });
        s.should.equal('good');

        s = render('{% if hungry or like_pizza %}good{% endif %}',
            { hungry: false, like_pizza: true });
        s.should.equal('good');

        s = render('{% if (hungry or like_pizza) and anchovies %}good{% endif %}',
            { hungry: false, like_pizza: true, anchovies: true });
        s.should.equal('good');
    });

    it('should compile for blocks', function() {
        var s = render('{% for i in arr %}{{ i }}{% endfor %}',
                       { arr: [1, 2, 3, 4, 5] });
        s.should.equal('12345');

        s = render('{% for item in arr | batch(2) %}{{ item[0] }}{% endfor %}',
                   { arr: ['a', 'b', 'c', 'd'] });
        s.should.equal('ac');

        s = render('{% for k, v in { one: 1, two: 2 } %}' +
                   '-{{ k }}:{{ v }}-{% endfor %}');
        s.should.equal('-one:1--two:2-');

        s = render('{% for i in [7,3,6] %}{{ loop.index }}{% endfor %}');
        s.should.equal('123');

        s = render('{% for i in [7,3,6] %}{{ loop.index0 }}{% endfor %}');
        s.should.equal('012');

        s = render('{% for i in [7,3,6] %}{{ loop.revindex }}{% endfor %}');
        s.should.equal('321');

        s = render('{% for i in [7,3,6] %}{{ loop.revindex0 }}{% endfor %}');
        s.should.equal('210');

        s = render('{% for i in [7,3,6] %}{% if loop.first %}{{ i }}{% endif %}{% endfor %}');
        s.should.equal('7');

        s = render('{% for i in [7,3,6] %}{% if loop.last %}{{ i }}{% endif %}{% endfor %}');
        s.should.equal('6');

        s = render('{% for i in [7,3,6] %}{{ loop.length }}{% endfor %}');
        s.should.equal('333');
    });

    it('should compile operators', function() {
        render('{{ 3 + 4 - 5 * 6 / 10 }}').should.equal('4');
        render('{{ 4**5 }}').should.equal('1024');
        render('{{ 9//5 }}').should.equal('1');
        render('{{ 9%5 }}').should.equal('4');
        render('{{ -5 }}').should.equal('-5');

        render('{% if 3 < 4 %}yes{% endif %}').should.equal('yes');
        render('{% if 3 > 4 %}yes{% endif %}').should.equal('');
        render('{% if 9 >= 10 %}yes{% endif %}').should.equal('');
        render('{% if 10 >= 10 %}yes{% endif %}').should.equal('yes');
        render('{% if 9 <= 10 %}yes{% endif %}').should.equal('yes');
        render('{% if 10 <= 10 %}yes{% endif %}').should.equal('yes');
        render('{% if 11 <= 10 %}yes{% endif %}').should.equal('');

        render('{% if 10 != 10 %}yes{% endif %}').should.equal('');
        render('{% if 10 == 10 %}yes{% endif %}').should.equal('yes');

        render('{% if foo(20) > bar %}yes{% endif %}',
               { foo: function(n) { return n - 1; },
                 bar: 15 })
            .should.equal('yes');
    });

    it('should compile macros', function() {
        var s = render('{% macro foo() %}This is a macro{% endmacro %}');
        s.should.equal('');

        s = render('{% macro foo(bar, bazbar, baz="foobar") %}' +
                   'This is a macro {{ bar }} {{ bazbar }} {{ baz }}' +
                   '{% endmacro %}' +
                   '{{ foo("arg1", "arg2") }}');
        s.should.equal('This is a macro arg1 arg2 foobar');
    });

    it('should import templates', function() {
        var s = render('{% import "import.html" as imp %}' +
                       '{{ imp.foo() }} {{ imp.bar }}');
        s.should.equal("Here's a macro baz");

        s = render('{% from "import.html" import foo as baz, bar %}' +
                       '{{ bar }} {{ baz() }}');
        s.should.equal("baz Here's a macro");
    });

    it('should inherit templates', function() {
        var s = render('{% extends "base.html" %}');
        s.should.equal('FooBarBazFizzle');

        s = render('hola {% extends "base.html" %} hizzle mumble');
        s.should.equal('FooBarBazFizzle');

        s = render('{% extends "base.html" %}' +
                   '{% block block1 %}BAR{% endblock %}');
        s.should.equal('FooBARBazFizzle');

        s = render('{% extends "base.html" %}' +
                   '{% block block1 %}BAR{% endblock %}' +
                   '{% block block2 %}BAZ{% endblock %}');
        s.should.equal('FooBARBAZFizzle');

        s = render('hola {% extends tmpl %} hizzle mumble',
                   { tmpl: 'base.html' });
        s.should.equal('FooBarBazFizzle');
    });

    it('should render parent blocks with super()', function() {
        var s = render('{% extends "base.html" %}' +
                       '{% block block1 %}{{ super() }}BAR{% endblock %}');
        s.should.equal('FooBarBARBazFizzle');
    });

    it('should include templates', function() {
        var s = render('hello world {% include "include.html" %}');
        s.should.equal('hello world FooInclude ');

        s = render('hello world {% include "include.html" %}',
                  { name: 'james' });
        s.should.equal('hello world FooInclude james');

        s = render('hello world {% include tmpl %}',
                  { name: 'thedude', tmpl: "include.html" });
        s.should.equal('hello world FooInclude thedude');
    });

    it('should maintain nested scopes', function() {
        var s = render('{% for i in [1,2] %}' +
                       '{% for i in [3,4] %}{{ i }}{% endfor %}' +
                       '{{ i }}{% endfor %}');
        s.should.equal('341342');
    });

    it('should allow blocks in for loops', function() {
        var s = render('{% extends "base2.html" %}' +
                       '{% block item %}hello{{ item }}{% endblock %}');
        s.should.equal('hello1hello2');
    });

    it('should make includes inherit scope', function() {
        var s = render('{% for item in [1,2] %}' +
                       '{% include "item.html" %}' +
                       '{% endfor %}');
        s.should.equal('showing 1showing 2');
    });

    it('should compile a set block', function() {
        var s = render('{% set username = "foo" %}{{ username }}',
                       { username: 'james' });
        s.should.equal('foo');

        s = render('{% set x, y = "foo" %}{{ x }}{{ y }}');
        s.should.equal('foofoo');

        s = render('{% include "set.html" %}{{ foo }}',
                   { foo: 'bar' });
        s.should.equal('bar');
    });

    it('should throw errors', function() {
        (function() {
            render('{% from "import.html" import boozle %}');
        }).should.throw(/cannot import 'boozle'/);
    });
});