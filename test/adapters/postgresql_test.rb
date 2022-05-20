require_relative "../test_helper"

class PostgresqlTest < ActionDispatch::IntegrationTest
  include AdapterTest

  def data_source
    "postgresql"
  end

  def test_run
    assert_result [{"hello" => "world"}], "SELECT 'world' AS hello"
  end

  def test_audit
    if no_binds?
      assert_audit "SELECT 'world' AS hello", "SELECT {var} AS hello", var: "world"
    else
      assert_audit "SELECT $1 AS hello\n\n[\"world\"]", "SELECT {var} AS hello", var: "world"
    end
  end

  def test_string
    assert_result [{"hello" => "world"}], "SELECT {var} AS hello", var: "world"
  end

  def test_integer
    assert_result [{"hello" => "1"}], "SELECT {var} AS hello", var: "1"
  end

  def test_float
    assert_result [{"hello" => "1.5"}], "SELECT {var} AS hello", var: "1.5"
  end

  def test_time
    assert_result [{"hello" => "2022-01-01 08:00:00"}], "SELECT {created_at} AS hello", created_at: "2022-01-01 08:00:00"
  end

  def test_nil
    # passes locally, but empty result on CI
    skip if ActiveRecord::VERSION::STRING.to_f < 5.2

    assert_result [{"hello" => nil}], "SELECT {var} AS hello", var: ""
  end

  def test_single_quote
    assert_result [{"hello" => "'"}], "SELECT {var} AS hello", var: "'"
  end

  def test_double_quote
    assert_result [{"hello" => '"'}], "SELECT {var} AS hello", var: '"'
  end

  def test_backslash
    assert_result [{"hello" => "\\"}], "SELECT {var} AS hello", var: "\\"
  end

  def test_multiple_variables
    assert_result [{"c1" => "one", "c2" => "two", "c3" => "one"}], "SELECT {var} AS c1, {var2} AS c2, {var} AS c3", var: "one", var2: "two"
  end

  def test_bad_position
    if no_binds?
      assert_error "syntax error at or near \"'hello'\"\nLINE 1: SELECT 'world' AS 'hello'", "SELECT 'world' AS {var}", var: "hello"
    else
      assert_bad_position "SELECT 'world' AS {var}", var: "hello"
    end
  end

  def test_bad_position_before
    if no_binds?
      assert_result [{"?column?" => "world"}], "SELECT{var}", var: "world"
    else
      assert_error "syntax error at or near \"SELECT$1\"", "SELECT{var}", var: "world"
    end
  end

  def test_bad_position_after
    if no_binds?
      assert_error "syntax error at or near \"456\"\nLINE 1: SELECT 'world'456", "SELECT {var}456", var: "world"
      assert_equal "SELECT 'world'456", Blazer::Audit.last.statement
    else
      assert_error "syntax error at or near \"456\"\nLINE 1: SELECT $1 456", "SELECT {var}456", var: "world"
      assert_equal "SELECT $1 456\n\n[\"world\"]", Blazer::Audit.last.statement
    end
  end

  def test_quoted
    if no_binds?
      assert_error "syntax error at or near \"''\"\nLINE 1: SELECT ''world'' AS hello", "SELECT '{var}' AS hello", var: "world"
    else
      assert_error "could not determine data type of parameter $1", "SELECT '{var}' AS hello", var: "world"
    end
  end

  private

  def no_binds?
    ActiveRecord::VERSION::STRING.to_f < 6.1 &&
      Blazer.data_sources[data_source].settings["url"].include?("prepared_statements=false")
  end
end
