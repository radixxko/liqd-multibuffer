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
        let head = start, buffers = this._buffers, range = { buffers: [], start: undefined, end: undefined, index: 0, length: 0 }, i = 0, length = end - start;

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

            if( range.start !== undefined && end !== 0 )
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
        if( deleteCount && typeof deleteCount !== 'number' )
        {
            buffers.unshift( deleteCount );
            deleteCount = 0;
        }

        if( start === undefined ){ start = 0; }
        if( start < 0 ){ start = this._length + start; }
        let end = deleteCount < 0 ? this._length + deleteCount : start + deleteCount;
        let range = this._getRange( start, end ), spliceStart;

        if( range.buffers.length && start !== end )
        {
            this._index = null;
            this._length -= range.length;

            if( this._length === 0 )
            {
                this._buffers = [];
            }
            else
            {
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

    spliceConcat( ...args )
    {
        let buffers = this.splice( ...args );

        return buffers.length ? ( buffers.length === 1 ? buffers[0] : Buffer.concat( buffers )) : Buffer.alloc(0);
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

    _equals( buffer, block, index, length )
    {
        let buff = this._buffers[block], matched = 0;

        if( buff[index] === buffer[matched] )
        {
            do
            {
                if( ++matched === length )
                {
                    return true;
                }
                else
                {
                    if( ++index >= buff.length  )
                    {
                        buff = this._buffers[++block]; index = 0;
                    }
                }
            }
            while( buff[index] === buffer[matched] )
        }

        return false;
    }

    equals( buffer, offset = 0, length = Infinity )
    {
        length = Math.min( length, buffer.length );

        if( offset + length <= this._length )
        {
            let range = this._getRange( offset );

            return this._equals( buffer, range.index, range.start, length );
        }

        return false;
    }

    indexOf( buffer, offset, encoding )
    {
        if( typeof offset === 'string' ){[ offset, encoding ] = [ 0, offset ]}
        if( typeof buffer === 'string' ){ buffer = Buffer.from( buffer, encoding ); }
        if( !offset ){ offset = 0; }
        //if( offset < 0 ){ offset = this._length - offset; }
        if( buffer.length === 0 ){ return offset < this._length ? offset : -1; }

        let b = 0, buff = this._buffers[0], i = 0, index = 0, until = this._length - buffer.length;

        while( index <= until && index < offset )
        {
            if( offset - index <= buff.length )
            {
                i = offset - index; index = offset;
            }
            else{ index += buff.length; buff = this._buffers[++b]; }
        }

        while( index <= until )
        {
            if( i + buffer.length <= buff.length )
            {
                let m = buff.indexOf( buffer, i );

                if( m !== -1 )
                {
                    return index + m - i;
                }
                else
                {
                    m = buff.length - buffer.length;
                    index += m - i; i = m; m = 0;
                }
            }

            while( index <= until && i < buff.length )
            {
                if( this._equals( buffer, b, i, buffer.length ))
                {
                    return index;
                }

                ++i; ++index;
            }

            buff = this._buffers[++b]; i = 0;
        }

        return -1;
    }

    get length()
    {
        return this._length;
    }

    clear()
    {
        this._buffers = [];
        this._length = 0;
        this._index = null;
    }
}
