'use strict';

module.exports = class MultiBuffer
{
    constructor( ...buffers )
    {
        this._buffers = [];
        this._length = 0;
        this._index = null;

        for( let buffer of buffers )
        {
            if( buffer.length )
            {
                this._buffers.push( buffer );
                this._length += buffer.length;
            }
        }
    }

    _getRange( start, end = 0 )
    {
        let head = start, buffers = this._buffers, range = { buffers: [], start: 0, end: undefined, index: 0, length: 0 }, i = 0, length = end - start;

        if( buffers.length )
        {
            if( start < buffers[0].length )
            {
                range.start = start;
                range.index = 0;
                range.buffers.push( buffers[0] );
            }
            else
            {
                start -= buffers[0].length;

                while( ++i < buffers.length )
                {
                    if( start < buffers[i].length )
                    {
                        range.start = start;
                        range.index = i;
                        range.buffers.push( buffers[i] );

                        break;
                    }
                    else{ start -= buffers[i].length; }
                }
            }

            if( range.buffers.length && end !== 0 )
            {
                if( end >= this._length )
                {
                    range.buffers = this._buffers.slice( range.index );
                    range.length = this._length - head;
                    range.end = range.buffers[range.buffers.length - 1].length;

                    if( start > 0 )
                    {
                        range.buffers[0] = range.buffers[0].slice( start );
                    }

                    return range;
                }
                else if( range.start + length <= buffers[range.index].length )
                {
                    range.end = range.start + length;
                    range.length = length;
                }
                else
                {
                    length -= buffers[range.index].length - range.start;
                    range.length += buffers[range.index].length - range.start;

                    while( ++i < buffers.length )
                    {
                        range.buffers.push( buffers[i] );

                        if( length <= buffers[i].length )
                        {
                            range.end = length;
                            range.length += length;

                            break;
                        }
                        else
                        {
                            length -= buffers[i].length;
                            range.length += buffers[i].length;
                        }
                    }
                }
            }

            if( range.buffers.length === 1 && ( range.start !== 0 || range.end !== range.buffers[0].length ))
            {
                range.buffers[0] = range.buffers[0].slice( range.start, range.end );
            }
            else if( range.buffers.length > 1 )
            {
                if( range.start !== 0 )
                {
                    range.buffers[0] = range.buffers[0].slice( range.start );
                }
                if( range.end !== range.buffers[range.buffers.length-1].length )
                {
                    range.buffers[range.buffers.length-1] = range.buffers[range.buffers.length-1].slice( 0, range.end );
                }
            }
        }

        return range;
    }

    append( ...buffers )
    {
        for( let buffer of buffers )
        {
            if( buffer.length )
            {
                this._buffers.push( buffer );
                this._length += buffer.length;
            }
        }
    }

    slice( start, end )
    {
        if( start === undefined ){ start = 0; }
        if( start < 0 ){ start = this._length + start; }
        if( end === undefined ){ end = this._length; }
        if( end < 0 ){ end = this._length + end; }

        end = Math.min( this._length, end );

        return start < end ? this._getRange( start, end ).buffers : [];
    }

    splice( start, deleteCount, ...buffers )
    {
        /*if( deleteCount && typeof deleteCount !== 'number' )
        {
            buffers.unshift( deleteCount );
            deleteCount = 0;
        }*/

        if( start < 0 ){ start = this._length + start; }
        let end = deleteCount < 0 ? this._length + deleteCount : start + deleteCount;
        let range = this._getRange( start, end ), spliceStart;

        if( range.buffers.length && start !== end )
        {
            this._index = null;
            this._length -= range.length;

            let spliceCount = Math.max( 0, range.buffers.length - 2 );

            if( range.buffers.length === 1 )
            {
                if( range.start === 0 )
                {
                    if( range.end === this._buffers[range.index].length )
                    {
                        this._buffers.splice( range.index, 1 );
                    }
                    else
                    {
                        this._buffers[range.index] = this._buffers[range.index].slice( range.end );
                    }
                }
                else if( range.end === this._buffers[range.index].length )
                {
                    this._buffers[range.index] = this._buffers[range.index].slice( 0, range.start );
                }
                else
                {
                    let tail = this._buffers[range.index].slice( range.end );

                    this._buffers[range.index] = this._buffers[range.index].slice( 0, range.start );
                    this._buffers.splice( range.index + 1, 0, tail );
                }
            }
            else
            {
                if( range.start === 0 )
                {
                    spliceStart = range.index; ++spliceCount;
                }
                else
                {
                    spliceStart = range.index + 1;
                    this._buffers[range.index] = this._buffers[range.index].slice( 0, range.start );
                }

                if( range.end === this._buffers[range.index + range.buffers.length - 1].length )
                {
                    ++spliceCount;
                }
                else
                {
                    this._buffers[range.index + range.buffers.length - 1] = this._buffers[range.index + range.buffers.length - 1].slice( range.end );
                }

                if( spliceCount )
                {
                    this._buffers.splice( spliceStart, spliceCount );
                }
            }
        }

        if( buffers.length )
        {
            this._index = null;
            this._length += buffers.reduce(( s, b ) => s += b.length, 0 );

            if( range.buffers.length === 0 )
            {
                range.index = this._buffers.length;
            }
            else if( range.start !== 0 )
            {
                if( range.start < this._buffers[range.index].length )
                {
                    let tail = this._buffers[range.index].slice( range.start );

                    this._buffers[range.index] = this._buffers[range.index].slice( 0, range.start );
                    buffers.push( tail );
                }

                ++range.index;
            }

            this._buffers.splice( range.index, 0, ...buffers );
        }

        return ( start !== end ) ? range.buffers : [];
    }

    /*compact( start, end )
    {

    }*/

    get( index )
    {
        if( index < 0 ){ index = this._length + index; }

        let range = this._getRange( index );

        return range.buffers.length ? range.buffers[0][0] : undefined;
    }

    set( index, value )
    {
        if( index < 0 ){ index = this._length + index; }

        let range = this._getRange( index );

        return range.buffers[0] = value;
    }

    /*indexOf( value, offset, encoding )
    {
        if( typeof offset === 'string' ){[ offset, encoding ] = [ undefined, offset ]}

        //if(  )
    }*/

    get length()
    {
        return this._length;
    }
}
